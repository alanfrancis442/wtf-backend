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

  // --- Puzzle State Management ---

  @SubscribeMessage('puzzle_request_state')
  handlePuzzleRequestState(@ConnectedSocket() client: Socket) {
    const puzzleState = this.mouseService.getPuzzleState();
    if (puzzleState) {
      client.emit('puzzle_state_sync', puzzleState);
    } else {
      client.emit('puzzle_no_state');
    }
  }

  @SubscribeMessage('puzzle_init_request')
  handlePuzzleInitRequest(
    @MessageBody()
    data: {
      width: number;
      height: number;
      imageWidth: number;
      imageHeight: number;
      imageX: number;
      imageY: number;
      rows: number;
      cols: number;
      rotationRange?: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    // Only initialize if no state exists
    if (!this.mouseService.getPuzzleState()) {
      console.log('Initializing puzzle state from client request', client.id);
      const puzzleState = this.mouseService.generatePuzzleState(
        data.width,
        data.height,
        data.imageWidth,
        data.imageHeight,
        data.imageX,
        data.imageY,
        data.rows,
        data.cols,
        data.rotationRange || 45,
      );
      // Broadcast to all clients including the one that requested
      this.server.emit('puzzle_state_sync', puzzleState);
    }
  }

  @SubscribeMessage('puzzle_piece_drag_start')
  handlePuzzleDragStart(
    @MessageBody()
    data: { pieceId: string; x: number; y: number; rotation?: number },
    @ConnectedSocket() client: Socket,
  ) {
    // Just broadcast, state update happens on drag end
    client.broadcast.emit('puzzle_piece_drag_start', {
      userId: client.id,
      pieceId: data.pieceId,
      x: data.x,
      y: data.y,
      rotation: data.rotation,
    });
  }

  @SubscribeMessage('puzzle_piece_drag_move')
  handlePuzzleDragMove(
    @MessageBody()
    data: { pieceId: string; x: number; y: number; rotation?: number },
    @ConnectedSocket() client: Socket,
  ) {
    // Throttled updates - just broadcast
    client.broadcast.emit('puzzle_piece_drag_move', {
      userId: client.id,
      pieceId: data.pieceId,
      x: data.x,
      y: data.y,
      rotation: data.rotation,
    });
  }

  @SubscribeMessage('puzzle_piece_drag_end')
  handlePuzzleDragEnd(
    @MessageBody()
    data: { pieceId: string; x: number; y: number; rotation?: number },
    @ConnectedSocket() client: Socket,
  ) {
    // Update state in service
    this.mouseService.updatePiecePosition(
      data.pieceId,
      data.x,
      data.y,
      'board',
      data.rotation,
    );

    client.broadcast.emit('puzzle_piece_drag_end', {
      userId: client.id,
      pieceId: data.pieceId,
      x: data.x,
      y: data.y,
      rotation: data.rotation,
    });
  }

  @SubscribeMessage('puzzle_piece_snap')
  handlePuzzlePieceSnap(
    @MessageBody() data: { pieceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const snapped = this.mouseService.snapPiece(data.pieceId);

    if (snapped) {
      const puzzleState = this.mouseService.getPuzzleState();
      if (puzzleState?.isCompleted) {
        this.server.emit('puzzle_completed');
      }
    }

    client.broadcast.emit('puzzle_piece_snap', {
      userId: client.id,
      pieceId: data.pieceId,
    });
  }

  @SubscribeMessage('puzzle_reset_request')
  handlePuzzleResetRequest(@ConnectedSocket() client: Socket) {
    const puzzleState = this.mouseService.getPuzzleState();
    // Only allow reset if game is completed
    if (puzzleState?.isCompleted) {
      console.log('Resetting puzzle state requested by', client.id);
      this.mouseService.resetPuzzleState();
      this.server.emit('puzzle_reset');
    }
  }
}
