/**
 * Unit-Tests für die WebSocket-Implementierung
 */

import { jest } from '@jest/globals';
import { WebSocketClient } from '../server/websocket.js';

describe('WebSocketClient', () => {
  let wsClient: WebSocketClient;
  const mockUrl = 'ws://localhost:3001';
  const mockOptions = {
    reconnectInterval: 100,
    maxReconnectAttempts: 3,
    heartbeatInterval: 100,
  };

  // Mocks für die Callbacks
  const mockOnMessage = jest.fn();
  const mockOnStatusChange = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    // WebSocket-Client mit Mock-Callbacks erstellen
    wsClient = new WebSocketClient({
      url: mockUrl,
      ...mockOptions,
      onMessage: mockOnMessage,
      onStatusChange: mockOnStatusChange,
      onError: mockOnError,
    });

    // Mocks zurücksetzen
    mockOnMessage.mockReset();
    mockOnStatusChange.mockReset();
    mockOnError.mockReset();
  });

  afterEach(() => {
    // WebSocket-Client trennen
    wsClient.disconnect();
  });

  test('sollte eine Verbindung herstellen können', async () => {
    // Verbindung herstellen
    await wsClient.connect();

    // Prüfen, ob der Status auf 'connected' gesetzt wurde
    expect(mockOnStatusChange).toHaveBeenCalledWith('connected');
  });

  test('sollte eine Nachricht senden können', async () => {
    // Verbindung herstellen
    await wsClient.connect();

    // Warten, bis die Verbindung hergestellt ist
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock für die send-Methode des WebSockets
    const mockSend = jest.fn();
    (wsClient as any).ws.send = mockSend;

    // Nachricht senden
    const message = { type: 'test', data: 'Hello, World!' };
    wsClient.send(message);

    // Prüfen, ob die send-Methode aufgerufen wurde
    expect(mockSend).toHaveBeenCalled();
    // Prüfen, ob die Nachricht korrekt serialisiert wurde
    expect(mockSend).toHaveBeenCalledWith(JSON.stringify(message));
  });

  test('sollte bei einem Verbindungsfehler einen Reconnect versuchen', async () => {
    // Verbindung herstellen
    await wsClient.connect();

    // Warten, bis die Verbindung hergestellt ist
    await new Promise(resolve => setTimeout(resolve, 100));

    // Reconnect-Methode mocken
    const mockReconnect = jest.fn();
    (wsClient as any).reconnect = mockReconnect;

    // Fehler simulieren
    const errorEvent = new Event('error');
    (wsClient as any).ws.onerror?.(errorEvent);

    // Prüfen, ob der Status auf 'error' gesetzt wurde
    expect(mockOnStatusChange).toHaveBeenCalledWith('error');
    // Prüfen, ob die Reconnect-Methode aufgerufen wurde
    expect(mockReconnect).toHaveBeenCalled();
  });

  test('sollte bei einem Verbindungsabbruch einen Reconnect versuchen', async () => {
    // Verbindung herstellen
    await wsClient.connect();

    // Warten, bis die Verbindung hergestellt ist
    await new Promise(resolve => setTimeout(resolve, 100));

    // Reconnect-Methode mocken
    const mockReconnect = jest.fn();
    (wsClient as any).reconnect = mockReconnect;

    // Verbindungsabbruch simulieren
    const closeEvent = new CloseEvent('close', { code: 1006, reason: 'Connection lost', wasClean: false });
    (wsClient as any).ws.onclose?.(closeEvent);

    // Prüfen, ob der Status auf 'disconnected' gesetzt wurde
    expect(mockOnStatusChange).toHaveBeenCalledWith('disconnected');
    // Prüfen, ob die Reconnect-Methode aufgerufen wurde
    expect(mockReconnect).toHaveBeenCalled();
  });

  test('sollte Nachrichten empfangen und verarbeiten können', async () => {
    // Verbindung herstellen
    await wsClient.connect();

    // Warten, bis die Verbindung hergestellt ist
    await new Promise(resolve => setTimeout(resolve, 100));

    // Nachricht simulieren
    const message = { type: 'test', data: 'Hello, World!' };
    const messageEvent = new MessageEvent('message', { data: JSON.stringify(message) });
    (wsClient as any).ws.onmessage?.(messageEvent);

    // Prüfen, ob die onMessage-Callback aufgerufen wurde
    expect(mockOnMessage).toHaveBeenCalledWith(message);
  });

  test('sollte mit komprimierten Nachrichten umgehen können', async () => {
    // Verbindung herstellen
    await wsClient.connect();

    // Warten, bis die Verbindung hergestellt ist
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock für die Dekomprimierungsmethode
    const mockDecompressData = jest.fn().mockReturnValue(JSON.stringify({ type: 'test', data: 'Compressed' }));
    (wsClient as any).decompressData = mockDecompressData;

    // Komprimierte Nachricht simulieren
    const compressedMessage = {
      type: 'compressed',
      data: 'base64encodeddata',
      originalSize: 100,
      timestamp: Date.now(),
    };
    const messageEvent = new MessageEvent('message', { data: JSON.stringify(compressedMessage) });
    
    // Mock für die base64ToArrayBuffer-Methode
    const mockBase64ToArrayBuffer = jest.fn().mockReturnValue(new Uint8Array());
    (wsClient as any).base64ToArrayBuffer = mockBase64ToArrayBuffer;
    
    // Nachricht verarbeiten
    (wsClient as any).ws.onmessage?.(messageEvent);

    // Prüfen, ob die Dekomprimierungsmethoden aufgerufen wurden
    expect(mockBase64ToArrayBuffer).toHaveBeenCalledWith('base64encodeddata');
    expect(mockDecompressData).toHaveBeenCalled();
    // Prüfen, ob die onMessage-Callback aufgerufen wurde
    expect(mockOnMessage).toHaveBeenCalledWith({ type: 'test', data: 'Compressed' });
  });

  test('sollte nach maximalen Reconnect-Versuchen aufgeben', async () => {
    // Verbindung herstellen
    await wsClient.connect();

    // Reconnect-Versuche manuell setzen
    (wsClient as any).reconnectAttempts = mockOptions.maxReconnectAttempts;

    // Reconnect versuchen
    (wsClient as any).reconnect();

    // Prüfen, ob der Status auf 'error' gesetzt wurde
    expect(mockOnStatusChange).toHaveBeenCalledWith('error');
    // Prüfen, ob die onError-Callback aufgerufen wurde
    expect(mockOnError).toHaveBeenCalled();
  });

  test('sollte Heartbeats senden', async () => {
    // Verbindung herstellen
    await wsClient.connect();

    // Warten, bis die Verbindung hergestellt ist
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock für die send-Methode
    const mockSend = jest.fn();
    wsClient.send = mockSend;

    // Heartbeat manuell auslösen
    (wsClient as any).sendHeartbeat();

    // Prüfen, ob die send-Methode aufgerufen wurde
    expect(mockSend).toHaveBeenCalled();
    // Prüfen, ob die Nachricht den Typ 'heartbeat' hat
    expect(mockSend.mock.calls[0][0]).toHaveProperty('type', 'heartbeat');
  });
}); 