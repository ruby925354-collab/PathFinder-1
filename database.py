import mysql.connector
from mysql.connector import pooling
import os

DB_HOST = os.getenv("DB_HOST", "switchyard.proxy.rlwy.net")
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "TkcNZWDdisJfnNpUOYzJmFvfzlYBulMD")
DB_NAME = os.getenv("DB_NAME", "pathfinder")
DB_PORT = int(os.getenv("DB_PORT", 56665))  

DB_CONFIG = {
    "host": DB_HOST,
    "user": DB_USER,
    "password": DB_PASS,
    "database": DB_NAME,
    "port": DB_PORT,
    "autocommit": False,
}

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)
