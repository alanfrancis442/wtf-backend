import { Injectable } from '@nestjs/common';

export interface UserPointer{
    id: string;
    name: string;
    color: string;
    current_page: string;
    x: number;
    y: number;
}

@Injectable()
export class MouseService {
    private users:Map<string, UserPointer> = new Map();

    private getRandomColor(): string {
        const colors = ['#F87171', '#60A5FA', '#34D399', '#FB923C', '#A78BFA', '#F472B6'];
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
        };
        this.users.set(id, user);
        return user;
    }

    updateUserPosition(id: string, x: number, y: number, current_page: string): UserPointer | null {
        const user = this.users.get(id);
        if (user) {
            user.x = x;
            user.y = y;
            user.current_page = current_page;
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
}