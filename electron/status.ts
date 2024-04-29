import { Status } from "./mockData/data";

export const endpoints = [
    {
        url: "http://0.0.0.0:8890/v0/status", //tts.py
        name: "Text to speech API",
    },
    // {
    //     url: "https://iguana.alexo.uk/v1/status",
    //     name: "V1 API",
    // },
    {
        url: "http://0.0.0.0:8892/v2/status", //fast.py
        name: "Image API",
    },
    {
        url: "http://0.0.0.0:8893/v3/status", //llm.py
        name: "LLM API",
    },
    {
        url: "http://0.0.0.0:8894/v4/status", //sadtalker
        name: "Avatar API",
    },
    // {
    //     url: "https://iguana.alexo.uk/v5/status",
    //     name: "V5 API",
    // },
    {
        url: "http://0.0.0.0:8896/v6/status", //music.py
        name: "Music API",
    },
    {
        url: "http://0.0.0.0:8897/v7/status", //audiofx.py
        name: "Sound Effects API",
    },
      //http://10.0.0.7:8898/v8/status/ => control.py
    {
        url: "http://0.0.0.0:8899/v9/status", //vid.py
        name: "Video API",
    }
  
]
export const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
export const statusServiceEndpoint = (serviceName: string) => "http://0.0.0.0:8898/v8/status/" + serviceName
interface ServiceStatusResponse {
    status: string;
    isInactive: boolean;
    isRunning: boolean;
    memoryUsage: string;
    uptime: string;
    lastCalled: string;
    LastStatusCode: string;
    last_line: string;
    isCudaError: boolean;
}
/**
 * Retrieves the status of multiple services by making HTTP requests to their respective endpoints.
 * @returns A promise that resolves to an array of Status objects representing the status of each service.
 */
export const getServiceStatus = async (): Promise<Status[]> => {
    const statuses: Status[] = []
    for (const endpoint of endpoints) {
        // console.log("Checking", endpoint.url)
        const controller = new AbortController();
        const { signal } = controller;



        try {
            const statusServiceResponse = await fetch(statusServiceEndpoint(endpoint.name));
            const statusService = await statusServiceResponse.json() as ServiceStatusResponse
            if (statusService.isCudaError) {
                console.log("Cuda error RESTART THE SERVICE:", endpoint.name)
                statuses.push({ url: endpoint.url, name: endpoint.name, status: "Offline" });
                console.log("Shutting down service ", endpoint.name)
                shutdownService(endpoint.name)
                continue
            }

            const response = await Promise.race([fetch(endpoint.url, { signal }), delay(1000).then(() => { controller.abort(); throw new Error("AbortError") })]);
            statuses.push({ url: endpoint.url, name: endpoint.name, status: response.status === 200 ? "Online" : "Offline" });
            // Handle the response
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                // console.log('Request aborted');
                statuses.push({ url: endpoint.url, name: endpoint.name, status: "Unresponsive" });

            } else {
                // console.error('Error:', error);
                statuses.push({ url: endpoint.url, name: endpoint.name, status: "Unresponsive" });

            }
        }
    }
    return statuses
}

export const controlServiceEndpoint = "hhttp://0.0.0.0:8899/v8/control"
/**
 * Shuts down a service.
 * @param serviceName - The name of the service to be shutdown.
 * @throws {Error} If the service is not found or if the shutdown fails.
 */
export const shutdownService = async (serviceName: string): Promise<void> => {
    const endpoint = endpoints.find(e => e.name === serviceName);
    if (endpoint === undefined) {
        throw new Error("Service not found");
    }
    const body = {
        serviceName,
        command: "shutdown"
    };

    const response = await fetch(controlServiceEndpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    if (response.status !== 200) {
        throw new Error("Failed to shutdown service");
    }
}
/**
 * Launches a service asynchronously.
 * @param serviceName - The name of the service to launch.
 * @throws Error if the service is not found or fails to launch.
 */
export const launchService = async (serviceName: string): Promise<void> => {
    const endpoint = endpoints.find(e => e.name === serviceName);
    if (endpoint === undefined) {
        throw new Error("Service not found");
    }
    const body = {
        serviceName,
        command: "launch"
    };

    const response = await fetch(controlServiceEndpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    if (response.status !== 200) {
        throw new Error("Failed to Launch service");
    }
    const text = await response.text()
    console.log("Service launched", text)
}