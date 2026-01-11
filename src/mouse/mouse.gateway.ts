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

  private puzzleState: any = null;

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
    if (this.puzzleState) {
      client.emit('puzzle_state_sync', this.puzzleState);
    } else {
      client.emit('puzzle_no_state');
    }
  }

  @SubscribeMessage('puzzle_init_state')
  handlePuzzleInitState(
    @MessageBody() state: any,
    @ConnectedSocket() client: Socket,
  ) {
    // Only set state if it doesn't exist to prevent overwrite
    if (!this.puzzleState) {
      console.log('Initializing puzzle state from client', client.id);
      this.puzzleState = state;
      // Broadcast to all other clients to sync up
      client.broadcast.emit('puzzle_state_sync', this.puzzleState);
    }
  }

  @SubscribeMessage('puzzle_piece_drag_start')
  handlePuzzleDragStart(
    @MessageBody() data: { pieceId: string; x: number; y: number },
    @ConnectedSocket() client: Socket,
  ) {
    // We don't necessarily need to update state on start, but we broadcast
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
    // Throttled updates - just broadcast
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
    // Update state
    if (this.puzzleState && this.puzzleState.pieces) {
      const piece = this.puzzleState.pieces.find((p) => p.id === data.pieceId);
      if (piece) {
        piece.x = data.x;
        piece.y = data.y;
        // Assume dropped in board container if dragging
        piece.container = 'board';
      }
    }

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
    if (this.puzzleState && this.puzzleState.pieces) {
      const piece = this.puzzleState.pieces.find((p) => p.id === data.pieceId);
      if (piece) {
        piece.snapped = true;
        piece.x = piece.correctX; // Snap to correct position
        piece.y = piece.correctY;
        piece.container = 'board';
      }

      // Check completion
      const allSnapped = this.puzzleState.pieces.every((p) => p.snapped);
      if (allSnapped) {
        this.puzzleState.isCompleted = true;
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
    // Only allow reset if game is completed or explicitly requested
    if (this.puzzleState && this.puzzleState.isCompleted) {
      console.log('Resetting puzzle state requested by', client.id);
      this.puzzleState = null;
      this.server.emit('puzzle_reset');
    }
  }
}
