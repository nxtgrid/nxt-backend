import { SubscribeMessage, WebSocketGateway, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  afterInit(server: Server) {
    this.server = server;
  }

  handleDisconnect() {}

  handleConnection() {}

  // This adds a client to a room
  @SubscribeMessage('join')
  handleMessage(client: Socket, payload: { grid_id?: string }): 'ok' {
    if(payload?.grid_id) {
      client.join(payload?.grid_id); // Join the room belonging to the grid
    }
    return 'ok';
  }

  /**
   * Get the Socket.IO server instance.
   * Exposed for use by WebsocketService.
   */
  getServer(): Server | null {
    return this.server || null;
  }
}
