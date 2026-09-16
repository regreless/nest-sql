//查询数据库的工具
import { Pool } from 'pg'
import 'dotenv/config'

// mpc server  独立进程，需要初始化数据库连接
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function handle_database_query(args: { name?: string; limit?: number }): Promise<string> {
    const { name, limit = 10 } = args
    // 构建查询条件
    const conditions: string[] = []
    const query_values: (string | number)[] = []

    if (name) {
        query_values.push(`%${name}%`)
        conditions.push(`name ILIKE $${query_values.length}`)
    }

    query_values.push(limit)
    const query = `
        SELECT id, "studentNo" AS student_no, name
        FROM student
        ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}
        ORDER BY id
        LIMIT $${query_values.length}
    `

    const result = await pool.query(query, query_values)
    const students = result.rows

    const student_list = students.map(student => `ID: ${student.id}, Student No: ${student.student_no}, Name: ${student.name}`).join('\n')
    return `Found ${students.length} student(s):\n${student_list}`
}
