import { Server } from 'socket.io';

declare global {
  // Erweiterung für Socket.IO-Server
  interface SocketIOServerType extends Server {
    to: (room: string) => {
      emit: (event: string, data: unknown) => void;
    };
  }

  // Erweiterung für fetch-Mock
  namespace NodeJS {
    interface Global {
      fetch: typeof fetch;
    }
  }
}

export {}; 