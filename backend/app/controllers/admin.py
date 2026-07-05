from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.database import db
from app.models.usuario import Usuario

admin_bp = Blueprint('admin_bp', __name__)


def _admin_actual():
    """Devuelve el usuario autenticado si es admin, o None si no lo es."""
    id_usuario = get_jwt_identity()
    usuario = Usuario.query.get(id_usuario)
    if not usuario or usuario.rol != 'admin':
        return None
    return usuario


@admin_bp.route('/usuarios', methods=['GET'])
@jwt_required()
def listar_usuarios():
    if not _admin_actual():
        return jsonify({"error": "No autorizado"}), 403

    usuarios = Usuario.query.all()
    return jsonify([{
        "id": u.id,
        "nombre_usuario": u.nombre_usuario,
        "correo": u.correo,
        "rol": u.rol,
        "activo": u.activo,
        "fecha_creacion": u.fecha_creacion.isoformat() if u.fecha_creacion else None
    } for u in usuarios]), 200


@admin_bp.route('/usuarios/<int:id>/estado', methods=['PUT'])
@jwt_required()
def cambiar_estado(id):
    admin = _admin_actual()
    if not admin:
        return jsonify({"error": "No autorizado"}), 403
    if admin.id == id:
        return jsonify({"error": "No puedes suspender tu propia cuenta"}), 400

    usuario = Usuario.query.get(id)
    if not usuario:
        return jsonify({"error": "Usuario no encontrado"}), 404

    usuario.activo = not usuario.activo
    db.session.commit()
    return jsonify({"id": usuario.id, "activo": usuario.activo}), 200


@admin_bp.route('/usuarios/<int:id>', methods=['DELETE'])
@jwt_required()
def eliminar_usuario(id):
    admin = _admin_actual()
    if not admin:
        return jsonify({"error": "No autorizado"}), 403
    if admin.id == id:
        return jsonify({"error": "No puedes eliminar tu propia cuenta"}), 400

    usuario = Usuario.query.get(id)
    if not usuario:
        return jsonify({"error": "Usuario no encontrado"}), 404

    db.session.delete(usuario)
    db.session.commit()
    return jsonify({"mensaje": "Usuario eliminado"}), 200