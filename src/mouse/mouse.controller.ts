import { Controller, Get } from '@nestjs/common';
import { MouseService } from './mouse.service';

@Controller('mouse')
export class MouseController {
    constructor(private readonly mouseService: MouseService) {}

    // return the length of users active mouse sessions
    @Get()
    getStatus() {
        return 'Mouse is active';
    }

    @Get('users')
    getUsers() {
        return ['user1', 'user2', 'user3'];
    }
}
