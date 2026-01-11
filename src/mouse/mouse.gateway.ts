import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MouseService } from './mouse.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MouseGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private puzzleSeed?: number;

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
  handelPointerMove(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      x: number;
      y: number;
      scrollX: number;
      scrollY: number;
      pageX: number;
      pageY: number;
      current_page: string;
    },
  ) {
    const updatedUser = this.mouseService.updateUserPosition(
      client.id,
      data.x,
      data.y,
      data.scrollX,
      data.scrollY,
      data.pageX,
      data.pageY,
      data.current_page,
    );
    if (updatedUser) {
      client.broadcast.emit('pointer_moved', updatedUser);
    }
  }

  @SubscribeMessage('scroll_update')
  handleScrollUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { scrollX: number; scrollY: number },
  ) {
    const updatedUser = this.mouseService.updateUserScroll(
      client.id,
      data.scrollX,
      data.scrollY,
    );
    if (updatedUser) {
      client.broadcast.emit('pointer_moved', updatedUser);
    }
  }

  // Puzzle seed management - ensure all users get the same seed
  @SubscribeMessage('puzzle_request_seed')
  handlePuzzleSeedRequest(@ConnectedSocket() client: Socket) {
    // Initialize seed once, then reuse it for all users
    if (!this.puzzleSeed) {
      this.puzzleSeed = Date.now();
      console.log('Puzzle seed initialized:', this.puzzleSeed);
    }
    
    // Send the same seed to all clients
    client.emit('puzzle_seed', { seed: this.puzzleSeed });
    console.log('Puzzle seed sent to client:', client.id, this.puzzleSeed);
  }

  // Puzzle piece drag events
  @SubscribeMessage('puzzle_piece_drag_start')
  handlePuzzleDragStart(
    @MessageBody() data: { pieceId: string; x: number; y: number },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('puzzle_piece_drag_start from', client.id, data);
    
    // Broadcast to all other clients with userId
    client.broadcast.emit('puzzle_piece_drag_start', {
      userId: client.id,
      pieceId: data.pieceId,
      x: data.x,
      y: data.y,
    });
  }

  @SubscribeMessage('puzzle_piece_drag_move')
  handlePuzzleDragMove(
    @MessageBody() data: { pieceId: string; x: number; y: number },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast to all other clients with userId (throttled by client)
    client.broadcast.emit('puzzle_piece_drag_move', {
      userId: client.id,
      pieceId: data.pieceId,
      x: data.x,
      y: data.y,
    });
  }

  @SubscribeMessage('puzzle_piece_drag_end')
  handlePuzzleDragEnd(
    @MessageBody() data: { pieceId: string; x: number; y: number },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('puzzle_piece_drag_end from', client.id, data);
    
    // Broadcast to all other clients with userId
    client.broadcast.emit('puzzle_piece_drag_end', {
      userId: client.id,
      pieceId: data.pieceId,
      x: data.x,
      y: data.y,
    });
  }

  @SubscribeMessage('puzzle_piece_snap')
  handlePuzzlePieceSnap(
    @MessageBody() data: { pieceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('puzzle_piece_snap from', client.id, data);
    
    // Broadcast to all other clients with userId
    client.broadcast.emit('puzzle_piece_snap', {
      userId: client.id,
      pieceId: data.pieceId,
    });
  }
}

