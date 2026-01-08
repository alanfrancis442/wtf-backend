import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MouseService } from './mouse.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})

export class MouseGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server:Server;

  constructor(private readonly mouseService: MouseService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const user = this.mouseService.createUser(client.id, '/');

    client.emit('init', user);
    client.emit('current_users', this.mouseService.getAllUsers());
    client.broadcast.emit('new_user_joined', user);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.mouseService.removeUser(client.id);
    client.broadcast.emit('user_left', client.id);
  }

  @SubscribeMessage('move_pointer')
  handelPointerMove(@ConnectedSocket() client: Socket,@MessageBody() data: {x: number, y: number,current_page: string}) {
    const updatedUser = this.mouseService.updateUserPosition(client.id, data.x, data.y, data.current_page);
    if (updatedUser) {
      client.broadcast.emit('pointer_moved', updatedUser);
    }
  }
}
