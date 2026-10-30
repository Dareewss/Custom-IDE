export class WorkerClient<Request, Response> {
  private worker?: Worker;
  private nextId = 0;
  private pending = new Map<
    number,
    { resolve: (value: Response) => void; reject: (reason: Error) => void }
  >();
  constructor(private readonly create: () => Worker) {}
  call(request: Request): Promise<Response> {
    if (!this.worker) {
      this.worker = this.create();
      this.worker.onmessage = (
        event: MessageEvent<{ id: number; result?: Response; error?: string }>,
      ) => {
        const task = this.pending.get(event.data.id);
        if (!task) return;
        this.pending.delete(event.data.id);
        if (event.data.error) task.reject(new Error(event.data.error));
        else task.resolve(event.data.result as Response);
      };
      this.worker.onerror = (event) => {
        this.terminate(new Error(event.message));
      };
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ id, request });
    });
  }
  terminate(reason = new Error('Worker stopped.')) {
    this.worker?.terminate();
    this.worker = undefined;
    for (const task of this.pending.values()) task.reject(reason);
    this.pending.clear();
  }
}
