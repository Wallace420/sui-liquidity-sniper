declare class TaskQueue {
    isProcessing: boolean;
    queue: Array<() => Promise<void>>;
    constructor();
    addTask(task: any): void;
    processQueue(): Promise<void>;
}
declare class TaskQueueDelayed extends TaskQueue {
    delay: number;
    constructor();
    processQueue(): Promise<void>;
}
export { TaskQueue, TaskQueueDelayed };
