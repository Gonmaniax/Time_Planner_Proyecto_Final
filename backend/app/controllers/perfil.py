from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.database import db
from app.models.usuario import Usuario
from app.controllers.auth import hash_password
import os

perfil_bp = Blueprint('perfil_bp', __name__)


@perfil_bp.route('', methods=['GET'])
@jwt_required()
def obtener_perfil():
    usuario = Usuario.query.get(get_jwt_identity())
    if not usuario:
        return jsonify({"error": "Usuario no encontrado"}), 404
    return jsonify({
        "id": usuario.id,
        "nombre_usuario": usuario.nombre_usuario,
        "correo": usuario.correo,
        "rol": usuario.rol
    }), 200


@perfil_bp.route('', methods=['PUT'])
@jwt_required()
def actualizar_perfil():
    usuario = Usuario.query.get(get_jwt_identity())
    if not usuario:
        return jsonify({"error": "Usuario no encontrado"}), 404

    datos = request.get_json() or {}
    nombre = (datos.get('nombre_usuario') or '').strip()
    correo = (datos.get('correo') or '').strip()

    if not nombre or not correo:
        return jsonify({"error": "Nombre y correo son obligatorios"}), 400

    existente = Usuario.query.filter(Usuario.correo == correo, Usuario.id != usuario.id).first()
    if existente:
        return jsonify({"error": "Ese correo ya está en uso"}), 409

    usuario.nombre_usuario = nombre
    usuario.correo = correo
    db.session.commit()
    return jsonify({"mensaje": "Perfil actualizado"}), 200


@perfil_bp.route('/contrasena', methods=['PUT'])
@jwt_required()
def cambiar_contrasena():
    usuario = Usuario.query.get(get_jwt_identity())
    if not usuario:
        return jsonify({"error": "Usuario no encontrado"}), 404

    datos = request.get_json() or {}
    actual = datos.get('actual', '')
    nueva = datos.get('nueva', '')

    if not actual or not nueva:
        return jsonify({"error": "Debes indicar la contraseña actual y la nueva"}), 400
    if len(nueva) < 6:
        return jsonify({"error": "La nueva contraseña debe tener al menos 6 caracteres"}), 400

    if hash_password(actual, usuario.salt) != usuario.contrasena_hash:
        return jsonify({"error": "La contraseña actual no es correcta"}), 401

    nuevo_salt = os.urandom(16).hex()
    usuario.salt = nuevo_salt
    usuario.contrasena_hash = hash_password(nueva, nuevo_salt)
    db.session.commit()
    return jsonify({"mensaje": "Contraseña actualizada"}), 200