import wait from "./wait.js";

class TaskQueue {
  isProcessing: boolean;
  queue: Array<() => Promise<void>> = [];

  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  // Adiciona uma tarefa à fila
  addTask(task: any) {
    this.queue.push(task);
    this.processQueue();
  }

  // Processa a fila, garantindo que as tarefas sejam executadas uma de cada vez
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const currentTask = this.queue.shift(); // Remove a tarefa da fila
      try {
        if (!currentTask) continue

        setTimeout(async () => {
          await currentTask(); // Executa a tarefa
        }, 100)
      } catch (error) {
        console.error('Erro ao processar a tarefa:', error);
      }
    }

    this.isProcessing = false;
  }
}

class TaskQueueDelayed extends TaskQueue {
  delay: number = 2000;

  constructor() {
    super();
    this.queue = [];
    this.isProcessing = false;
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const currentTask = this.queue.shift(); // Remove a tarefa da fila
      try {
        if (!currentTask) continue

        await wait(this.delay)
        await currentTask(); // Executa a tarefa

      } catch (error) {
        console.error('Erro ao processar a tarefa:', error);
      }
    }

    this.isProcessing = false;
  }
}


export { TaskQueue, TaskQueueDelayed };
