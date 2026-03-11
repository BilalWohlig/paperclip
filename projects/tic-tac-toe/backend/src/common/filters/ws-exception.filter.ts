import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch(WsException)
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: WsException, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const message =
      typeof exception.getError() === 'string'
        ? exception.getError()
        : (exception.getError() as any).message ?? 'An error occurred';
    client.emit('error', { message });
  }
}
