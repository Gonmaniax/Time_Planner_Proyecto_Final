"""
Script de un solo uso para crear el usuario administrador.
Se corre UNA vez, parado en la carpeta backend, con:  python crear_admin.py

No se expone como endpoint HTTP a propósito -- asi nadie puede
crear un admin nuevo desde el navegador ni con Postman.
"""
import os
from flask import Flask
from dotenv import load_dotenv

from app.models.database import db
from app.models.usuario import Usuario
from app.controllers.auth import hash_password

# ---- EDITA ESTOS 3 DATOS ANTES DE CORRER EL SCRIPT ----
NOMBRE = "Henry Admin"
CORREO = "timeplanner922@gmail.com"
PASSWORD = "TimiG"
# --------------------------------------------------------

load_dotenv()

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)
db.init_app(app)

with app.app_context():
    existente = Usuario.query.filter_by(correo=CORREO).first()
    if existente:
        print(f"Ya existe un usuario con ese correo (id={existente.id}, rol={existente.rol}).")
        print("Si quieres convertirlo en admin, corre esto en MySQL:")
        print(f'  UPDATE usuarios SET rol="admin" WHERE correo="{CORREO}";')
    else:
        salt = os.urandom(16).hex()
        admin = Usuario(
            nombre_usuario=NOMBRE,
            correo=CORREO,
            contrasena_hash=hash_password(PASSWORD, salt),
            salt=salt,
            rol="admin",   # <-- aqui SI se fuerza admin, a diferencia del registro publico
            activo=True
        )
        db.session.add(admin)
        db.session.commit()
        print(f"Usuario admin creado correctamente: {CORREO} / {PASSWORD}")
        print("Recuerda cambiar la contraseña despues de la expo.")