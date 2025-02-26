import wait from "./wait.js";
class TaskQueue {
    isProcessing;
    queue = [];
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }
    // Adiciona uma tarefa à fila
    addTask(task) {
        this.queue.push(task);
        this.processQueue();
    }
    // Processa a fila, garantindo que as tarefas sejam executadas uma de cada vez
    async processQueue() {
        if (this.isProcessing)
            return;
        this.isProcessing = true;
        while (this.queue.length > 0) {
            const currentTask = this.queue.shift(); // Remove a tarefa da fila
            try {
                if (!currentTask)
                    continue;
                setTimeout(async () => {
                    await currentTask(); // Executa a tarefa
                }, 100);
            }
            catch (error) {
                console.error('Erro ao processar a tarefa:', error);
            }
        }
        this.isProcessing = false;
    }
}
class TaskQueueDelayed extends TaskQueue {
    delay = 2000;
    constructor() {
        super();
        this.queue = [];
        this.isProcessing = false;
    }
    async processQueue() {
        if (this.isProcessing)
            return;
        this.isProcessing = true;
        while (this.queue.length > 0) {
            const currentTask = this.queue.shift(); // Remove a tarefa da fila
            try {
                if (!currentTask)
                    continue;
                await wait(this.delay);
                await currentTask(); // Executa a tarefa
            }
            catch (error) {
                console.error('Erro ao processar a tarefa:', error);
            }
        }
        this.isProcessing = false;
    }
}
export { TaskQueue, TaskQueueDelayed };
//# sourceMappingURL=taskQueue.js.map