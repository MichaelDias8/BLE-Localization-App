class NavigationModule {
    constructor(graph, coordinates) {
        this.graph = graph;
        this.coordinates = coordinates;
    }

    dijkstra(start, destination) {
        const distances = {};
        const pq = new MinPriorityQueue({ priority: (x) => x.distance });
        const previous = {};
        const path = [];
        const visited = new Set();

        for (let node in this.graph) {
            if (node === start) {
                distances[node] = 0;
                pq.enqueue({ node, distance: 0 });
            } else {
                distances[node] = Infinity;
                pq.enqueue({ node, distance: Infinity });
            }
            previous[node] = null;
        }

        while (!pq.isEmpty()) {
            let { element: currentNode } = pq.dequeue();
            currentNode = currentNode.node;

            if (currentNode === destination) {
                while (previous[currentNode]) {
                    path.unshift({ id: currentNode, coordinates: this.coordinates[currentNode] });
                    currentNode = previous[currentNode];
                }
                path.unshift({ id: start, coordinates: this.coordinates[start] });
                return path;
            }

            if (!visited.has(currentNode)) {
                visited.add(currentNode);

                for (let neighbor of this.graph[currentNode]) {
                    let [nextNode, weight] = neighbor;
                    let alt = distances[currentNode] + weight;

                    if (alt < distances[nextNode]) {
                        distances[nextNode] = alt;
                        previous[nextNode] = currentNode;
                        pq.enqueue({ node: nextNode, distance: alt });
                    }
                }
            }
        }

        return [];
    }
}

class MinPriorityQueue {
    constructor(config) {
        this.heap = [];
        this.priority = config.priority;
    }

    enqueue(element) {
        this.heap.push(element);
        this.heapifyUp(this.heap.length - 1);
    }

    dequeue() {
        const element = this.heap[0];
        const end = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = end;
            this.heapifyDown(0);
        }
        return { element };
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    heapifyUp(index) {
        let element = this.heap[index];
        while (index > 0) {
            let parentIndex = Math.floor((index - 1) / 2);
            let parent = this.heap[parentIndex];
            if (this.priority(element) >= this.priority(parent)) break;
            this.heap[index] = parent;
            index = parentIndex;
        }
        this.heap[index] = element;
    }

    heapifyDown(index) {
        let length = this.heap.length;
        let element = this.heap[index];
        while (true) {
            let leftChildIndex = 2 * index + 1;
            let rightChildIndex = 2 * index + 2;
            let leftChild, rightChild;
            let swap = null;

            if (leftChildIndex < length) {
                leftChild = this.heap[leftChildIndex];
                if (this.priority(leftChild) < this.priority(element)) {
                    swap = leftChildIndex;
                }
            }

            if (rightChildIndex < length) {
                rightChild = this.heap[rightChildIndex];
                if (
                    (swap === null && this.priority(rightChild) < this.priority(element)) ||
                    (swap !== null && this.priority(rightChild) < this.priority(leftChild))
                ) {
                    swap = rightChildIndex;
                }
            }

            if (swap === null) break;
            this.heap[index] = this.heap[swap];
            index = swap;
        }
        this.heap[index] = element;
    }
}

export { NavigationModule };