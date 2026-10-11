import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { getDatabaseConfig } from '../config/database.config.js';

dotenv.config();

const config = getDatabaseConfig(process.env);
const AppDataSource = new DataSource(config);
export default AppDataSource;
