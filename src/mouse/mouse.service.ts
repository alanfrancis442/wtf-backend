import { Injectable } from '@nestjs/common';

export interface UserPointer {
  id: string;
  name: string;
  color: string;
  current_page: string;
  x: number;
  y: number;
  scrollX?: number;
  scrollY?: number;
  pageX?: number;
  pageY?: number;
}

export interface PuzzlePieceShape {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PuzzlePiece {
  id: string;
  col: number;
  row: number;
  shape: PuzzlePieceShape;
  x: number;
  y: number;
  rotation: number;
  container: 'left' | 'right' | 'board';
  snapped: boolean;
  correctX: number;
  correctY: number;
}

export interface PuzzleState {
  seed: number;
  imageParams: {
    width: number;
    height: number;
    imageWidth: number;
    imageHeight: number;
    imageX: number;
    imageY: number;
    rows: number;
    cols: number;
    pieceWidth: number;
    pieceHeight: number;
  };
  pieces: PuzzlePiece[];
  isCompleted: boolean;
}

@Injectable()
export class MouseService {
  private users: Map<string, UserPointer> = new Map();
  private puzzleState: PuzzleState | null = null;

  private getRandomColor(): string {
    const colors = [
      '#F87171',
      '#60A5FA',
      '#34D399',
      '#FB923C',
      '#A78BFA',
      '#F472B6',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  createUser(id: string, current_page: string): UserPointer {
    const user: UserPointer = {
      id,
      name: `User_${id.substring(0, 5)}`,
      color: this.getRandomColor(),
      current_page,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      pageX: 0,
      pageY: 0,
    };
    this.users.set(id, user);
    return user;
  }

  updateUserPosition(
    id: string,
    x: number,
    y: number,
    scrollX: number,
    scrollY: number,
    pageX: number,
    pageY: number,
    current_page: string,
  ): UserPointer | null {
    const user = this.users.get(id);
    if (user) {
      user.x = x;
      user.y = y;
      user.scrollX = scrollX;
      user.scrollY = scrollY;
      user.pageX = pageX;
      user.pageY = pageY;
      user.current_page = current_page;
      return user;
    }
    return null;
  }

  updateUserScroll(
    id: string,
    scrollX: number,
    scrollY: number,
  ): UserPointer | null {
    const user = this.users.get(id);
    if (user) {
      user.scrollX = scrollX;
      user.scrollY = scrollY;
      user.pageX = scrollX + user.x;
      user.pageY = scrollY + user.y;
      return user;
    }
    return null;
  }

  removeUser(id: string): boolean {
    return this.users.delete(id);
  }

  getAllUsers(): UserPointer[] {
    return Array.from(this.users.values());
  }

  // Seeded Random Number Generator
  private seededRandom(seed: number): () => number {
    let currentSeed = seed;
    const m = 2 ** 48;
    const a = 25214903917;
    const c = 11;

    return () => {
      currentSeed = (a * currentSeed + c) % m;
      return currentSeed / m;
    };
  }

  // Generate puzzle state with seed-based randomization
  generatePuzzleState(
    width: number,
    height: number,
    imageWidth: number,
    imageHeight: number,
    imageX: number,
    imageY: number,
    rows: number,
    cols: number,
    rotationRange: number = 45,
  ): PuzzleState {
    const seed = Date.now();
    const random = this.seededRandom(seed);

    const pieceWidth = imageWidth / cols;
    const pieceHeight = imageHeight / rows;
    const padW = pieceWidth * 0.35;
    const padH = pieceHeight * 0.35;

    // Generate shapes
    const shapes: PuzzlePieceShape[][] = [];
    for (let y = 0; y < rows; y++) {
      shapes[y] = [];
      for (let x = 0; x < cols; x++) {
        const rightRand = random();
        const bottomRand = random();

        shapes[y][x] = {
          top: y === 0 ? 0 : -shapes[y - 1][x].bottom,
          right: x === cols - 1 ? 0 : rightRand > 0.5 ? 1 : -1,
          bottom: y === rows - 1 ? 0 : bottomRand > 0.5 ? 1 : -1,
          left: x === 0 ? 0 : -shapes[y][x - 1].right,
        };
      }
    }

    // Generate pieces with correct positions
    const pieces: PuzzlePiece[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const pieceXInImage = x * pieceWidth;
        const pieceYInImage = y * pieceHeight;

        pieces.push({
          id: `p_${x}_${y}`,
          col: x,
          row: y,
          shape: shapes[y][x],
          x: 0,
          y: 0,
          rotation: 0,
          container: 'left',
          snapped: false,
          correctX: imageX + pieceXInImage - padW,
          correctY: imageY + pieceYInImage - padH,
        });
      }
    }

    // Scramble pieces (assign random positions and rotations)
    // For simplicity, we'll use fixed sidebar dimensions
    // In a real implementation, these would be passed as parameters
    const sidebarWidth = 400;
    const sidebarHeight = height;

    for (const piece of pieces) {
      const rotRand = random();
      const sideRand = random();
      const xRand = random();
      const yRand = random();

      // Calculate rotation
      let rotation = 0;
      if (rotationRange > 0) {
        rotation = (rotRand - 0.5) * (rotationRange * 2);
      }

      piece.rotation = rotation;

      // Determine which sidebar
      const isLeft = sideRand < 0.5;
      piece.container = isLeft ? 'left' : 'right';

      // Random position in sidebar (piece dimensions approximate)
      const pieceW = pieceWidth + padW * 2;
      const pieceH = pieceHeight + padH * 2;
      const maxX = Math.max(0, sidebarWidth - pieceW);
      const maxY = Math.max(0, sidebarHeight - pieceH);

      piece.x = xRand * maxX;
      piece.y = yRand * maxY;
    }

    const puzzleState: PuzzleState = {
      seed,
      imageParams: {
        width,
        height,
        imageWidth,
        imageHeight,
        imageX,
        imageY,
        rows,
        cols,
        pieceWidth,
        pieceHeight,
      },
      pieces,
      isCompleted: false,
    };

    this.puzzleState = puzzleState;
    return puzzleState;
  }

  getPuzzleState(): PuzzleState | null {
    return this.puzzleState;
  }

  updatePiecePosition(
    pieceId: string,
    x: number,
    y: number,
    container?: 'left' | 'right' | 'board',
    rotation?: number,
  ): boolean {
    if (!this.puzzleState) return false;

    const piece = this.puzzleState.pieces.find((p) => p.id === pieceId);
    if (piece) {
      piece.x = x;
      piece.y = y;
      if (container !== undefined) {
        piece.container = container;
      }
      if (rotation !== undefined) {
        piece.rotation = rotation;
      }
      return true;
    }
    return false;
  }

  snapPiece(pieceId: string): boolean {
    if (!this.puzzleState) return false;

    const piece = this.puzzleState.pieces.find((p) => p.id === pieceId);
    if (piece) {
      piece.snapped = true;
      piece.x = piece.correctX;
      piece.y = piece.correctY;
      piece.container = 'board';
      piece.rotation = 0;

      // Check completion
      const allSnapped = this.puzzleState.pieces.every((p) => p.snapped);
      if (allSnapped) {
        this.puzzleState.isCompleted = true;
      }
      return true;
    }
    return false;
  }

  resetPuzzleState(): void {
    this.puzzleState = null;
  }
}
