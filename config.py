import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()


class ProductionConfig:
    DEBUG = False
    TESTING = False

    SECRET_KEY = os.environ.get("SECRET_KEY")
    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY environment variable is not set")

    database_url = os.environ.get("DATABASE_URL") or os.environ.get("MYSQL_URL")

    if database_url:
        if database_url.startswith("mysql://"):
            database_url = database_url.replace("mysql://", "mysql+pymysql://", 1)
    else:
        user = os.environ.get('MYSQLUSER', '')
        password = os.environ.get('MYSQLPASSWORD', '')
        host = os.environ.get('MYSQLHOST', '')

        port = os.environ.get('MYSQLPORT', '').strip()
        if not port:
            port = '3306'

        db_name = os.environ.get('MYSQLDATABASE', '')
        
        database_url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{db_name}"

    SQLALCHEMY_DATABASE_URI = database_url

    if not SQLALCHEMY_DATABASE_URI or "None" in SQLALCHEMY_DATABASE_URI:
        raise RuntimeError("Database environment variables are not configured")

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
        "pool_timeout": 20,
    }

    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

    SESSION_COOKIE_NAME = "caremed_session"
    SESSION_COOKIE_SECURE = True        
    SESSION_COOKIE_HTTPONLY = True      
    SESSION_COOKIE_SAMESITE = "Lax"  

    REMEMBER_COOKIE_DURATION    = timedelta(hours=8)  
    REMEMBER_COOKIE_SECURE      = True
    REMEMBER_COOKIE_HTTPONLY    = True
    REMEMBER_COOKIE_SAMESITE = "Lax"
    PERMANENT_SESSION_LIFETIME  = timedelta(hours=2)   

    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  

    MAIL_SERVER = "smtp.gmail.com"
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USE_SSL = False
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD")
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        raise RuntimeError("MAIL credentials are not configured")

    MAIL_DEFAULT_SENDER = (
        os.environ.get("MAIL_SENDER_NAME", "CareMed Security"),
        MAIL_USERNAME
    )
    MAIL_MAX_EMAILS = 5
    MAIL_TIMEOUT = 10
    MAIL_ASCII_ATTACHMENTS = False


    SECURITY_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "X-XSS-Protection": "1; mode=block",
    }
    
    
    

class DevConfig:

    DEBUG = True
    TESTING = False

    SECRET_KEY = os.environ.get("SECRET_KEY")


    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
    }


    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")


    SESSION_COOKIE_NAME = "caremed_dev_session"

    SESSION_COOKIE_SECURE = False     
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"


    REMEMBER_COOKIE_DURATION    = timedelta(hours=8)
    REMEMBER_COOKIE_SECURE      = False
    REMEMBER_COOKIE_HTTPONLY    = True
    PERMANENT_SESSION_LIFETIME  = timedelta(hours=2)


    MAX_CONTENT_LENGTH = 16 * 1024 * 1024


    MAIL_SERVER = "smtp.gmail.com"
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USE_SSL = False
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD")

    MAIL_DEFAULT_SENDER = (
        os.environ.get("MAIL_SENDER_NAME", "CareMed Dev"),
        MAIL_USERNAME
    )

    MAIL_MAX_EMAILS = 5
    MAIL_TIMEOUT = 10

    MAIL_SUPPRESS_SEND = False


    SECURITY_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
    }