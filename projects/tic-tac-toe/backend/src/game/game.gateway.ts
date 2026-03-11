import { Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';
import { Server, Socket } from 'socket.io';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { MakeMoveDto } from './dto/make-move.dto';
import { GameService } from './game.service';
import { RoomService } from './room.service';

@UseFilters(new WsExceptionFilter())
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/game' })
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);

  constructor(
    private readonly gameService: GameService,
    private readonly roomService: RoomService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const { room, wasInRoom } = this.roomService.removePlayer(client.id);
    if (wasInRoom && room) {
      this.server.to(room.code).emit('player_disconnected', {
        message: 'Your opponent has disconnected.',
      });
    }
  }

  @SubscribeMessage('create_room')
  handleCreateRoom(client: Socket, payload: CreateRoomDto): void {
    const room = this.roomService.createRoom(payload.playerName, client.id);
    void client.join(room.code);
    client.emit('room_created', { roomCode: room.code });
    this.logger.log(`Room created: ${room.code} by ${payload.playerName}`);
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(client: Socket, payload: JoinRoomDto): void {
    const room = this.roomService.joinRoom(
      payload.roomCode,
      payload.playerName,
      client.id,
    );
    void client.join(room.code);

    const [playerX, playerO] = room.players;
    const xSocketId = playerX.symbol === 'X' ? playerX.socketId : playerO.socketId;
    const oSocketId = playerX.symbol === 'O' ? playerX.socketId : playerO.socketId;
    const xName = playerX.symbol === 'X' ? playerX.name : playerO.name;
    const oName = playerX.symbol === 'O' ? playerX.name : playerO.name;

    this.server.to(xSocketId).emit('game_started', {
      board: room.board,
      yourSymbol: 'X',
      opponentName: oName,
      turn: 'X',
      roomCode: room.code,
    });

    this.server.to(oSocketId).emit('game_started', {
      board: room.board,
      yourSymbol: 'O',
      opponentName: xName,
      turn: 'X',
      roomCode: room.code,
    });

    this.logger.log(`Room joined: ${room.code} by ${payload.playerName}`);
  }

  @SubscribeMessage('make_move')
  handleMakeMove(client: Socket, payload: MakeMoveDto): void {
    const room = this.roomService.findRoomBySocket(client.id);
    if (!room) {
      throw new WsException('You are not in a room');
    }

    const validation = this.gameService.validateMove(room, client.id, payload.position);
    if (!validation.valid) {
      throw new WsException(validation.error ?? 'Invalid move');
    }

    const player = room.players.find((p) => p.socketId === client.id)!;
    const updatedRoom = this.roomService.makeMove(room.code, client.id, payload.position);

    let gameState: 'playing' | 'won' | 'draw' = 'playing';
    if (updatedRoom.winner === 'draw') {
      gameState = 'draw';
    } else if (updatedRoom.winner) {
      gameState = 'won';
    }

    this.server.to(room.code).emit('move_made', {
      board: updatedRoom.board,
      position: payload.position,
      symbol: player.symbol,
      nextTurn: updatedRoom.turn,
      gameState,
      ...(updatedRoom.winner && updatedRoom.winner !== 'draw'
        ? { winner: updatedRoom.winner }
        : {}),
    });
  }

  @SubscribeMessage('rematch_request')
  handleRematchRequest(client: Socket): void {
    const { room, requesterName } = this.roomService.requestRematch(client.id);
    const opponent = room.players.find((p) => p.socketId !== client.id);
    if (opponent) {
      this.server.to(opponent.socketId).emit('rematch_requested', {
        requesterName,
      });
    }
  }

  @SubscribeMessage('rematch_accept')
  handleRematchAccept(client: Socket): void {
    const room = this.roomService.acceptRematch(client.id);

    const [p1, p2] = room.players;
    const xPlayer = p1.symbol === 'X' ? p1 : p2;
    const oPlayer = p1.symbol === 'O' ? p1 : p2;

    this.server.to(xPlayer.socketId).emit('game_started', {
      board: room.board,
      yourSymbol: 'X',
      opponentName: oPlayer.name,
      turn: 'X',
      roomCode: room.code,
    });

    this.server.to(oPlayer.socketId).emit('game_started', {
      board: room.board,
      yourSymbol: 'O',
      opponentName: xPlayer.name,
      turn: 'X',
      roomCode: room.code,
    });
  }
}
