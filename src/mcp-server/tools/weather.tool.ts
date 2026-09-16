export async function handleWeatherQuery(args: { location: string }): Promise<string> {
    const { location } = args
    // 这里可以添加调用天气API的逻辑，以下是一个模拟的响应
    return `The current weather in ${location} is sunny with a temperature of 25°C.`
}
