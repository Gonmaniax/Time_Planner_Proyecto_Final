from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
from datetime import timedelta
from flask_cors import CORS
import os
from app.controllers.sesiones import sesiones_bp
from app.controllers.reportes import reportes_bp
from app.controllers.recordatorios import recordatorios_bp
from app.controllers.admin import admin_bp
from app.controllers.perfil import perfil_bp
from app.extensions import mail
from app.controllers.recuperacion import recuperacion_bp
import socket

socket.getaddrinfo = lambda host, port, family=0, type=0, proto=0, flags=0, _orig=socket.getaddrinfo: _orig(host, port, socket.AF_INET, type, proto, flags)

load_dotenv()

app = Flask(__name__)
CORS(app,
     origins=["http://localhost:4200", "https://timeplanner-production.up.railway.app"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     expose_headers=["Content-Disposition"])

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.register_blueprint(sesiones_bp, url_prefix="/api/sesiones")
# Establese el tiempo de vida de el token
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=4)
app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "connect_args": {"connect_timeout": 5}
}
app.register_blueprint(reportes_bp, url_prefix="/api/reportes")
app.register_blueprint(recordatorios_bp, url_prefix="/api/recordatorios")
app.register_blueprint(admin_bp, url_prefix="/api/admin")
app.register_blueprint(perfil_bp, url_prefix="/api/perfil")
app.config["MAIL_SERVER"] = os.getenv("MAIL_SERVER")
app.config["MAIL_PORT"] = int(os.getenv("MAIL_PORT"))
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")
# app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USE_SSL"] = True

mail.init_app(app)
app.register_blueprint(recuperacion_bp, url_prefix="/api/recuperacion")

from app.models.database import db
db.init_app(app)

jwt = JWTManager(app)

from app.controllers.auth import auth_bp
from app.controllers.tareas import tareas_bp
from app.controllers.categorias import categorias_bp

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(tareas_bp, url_prefix="/api/tareas")
app.register_blueprint(categorias_bp, url_prefix="/api/categorias")

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        
        # Crear categorías predeterminadas si no existen
        from app.models.categoria import Categoria
        categorias_default = ["Hogar", "Estudio", "Trabajo", "Personal"]
        for nombre in categorias_default:
            if not Categoria.query.filter_by(nombre=nombre, tipo="predeterminada").first():
                db.session.add(Categoria(nombre=nombre, tipo="predeterminada"))
        db.session.commit()
        
    app.run(debug=True)
