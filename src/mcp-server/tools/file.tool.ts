export function handleFileOperation(args: { operation: string; filePath: string }): string {
    const { operation, filePath } = args
    if (operation === 'read') {
        // 这里可以添加读取文件的逻辑
        return `Reading file at path: ${filePath}`
    } else if (operation === 'write') {
        // 这里可以添加写入文件的逻辑
        return `Writing to file at path: ${filePath}`
    } else {
        return 'Unsupported file operation'
    }
}
