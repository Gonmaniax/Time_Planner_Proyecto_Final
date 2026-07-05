from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from app.models.database import db
from app.models.usuario import Usuario
import hashlib
import os

auth_bp = Blueprint("auth", __name__)

def hash_password(password, salt):
    return hashlib.sha256((password + salt).encode()).hexdigest()

@auth_bp.route("/registro", methods=["POST"])
def registro():
    data = request.get_json()

    if Usuario.query.filter_by(correo=data["correo"]).first():
        return jsonify({"error": "El correo ya está registrado"}), 400

    salt = os.urandom(16).hex()
    contrasena_hash = hash_password(data["password"], salt)

    usuario = Usuario(
        nombre_usuario=data["nombre"],
        correo=data["correo"],
        contrasena_hash=contrasena_hash,
        salt=salt,
        rol="usuario",   
        activo=True
    )

    db.session.add(usuario)
    db.session.commit()

    return jsonify({"mensaje": "Usuario creado correctamente"}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    usuario = Usuario.query.filter_by(correo=data["correo"]).first()

    if not usuario:
        return jsonify({"error": "Credenciales inválidas"}), 401

    contrasena_hash = hash_password(data["password"], usuario.salt)

    if contrasena_hash != usuario.contrasena_hash:
        return jsonify({"error": "Credenciales inválidas"}), 401

    if not usuario.activo:  
        return jsonify({"error": "Tu cuenta ha sido suspendida"}), 403

    token = create_access_token(
    identity=str(usuario.id),
    additional_claims={
        "nombre": usuario.nombre_usuario,
        "rol": usuario.rol
    })

    return jsonify({
        "token": token,
        "usuario": usuario.to_dict()
    }), 200