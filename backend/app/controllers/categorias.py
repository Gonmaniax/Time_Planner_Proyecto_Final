from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.database import db
from app.models.categoria import Categoria

categorias_bp = Blueprint("categorias", __name__)

@categorias_bp.route("", methods=["GET"])
@jwt_required()
def get_categorias():
    usuario_id = int(get_jwt_identity())
    categorias = Categoria.query.filter(
        (Categoria.id_usuario == usuario_id) |
        (Categoria.tipo == 'predeterminada')
    ).all()
    return jsonify([c.to_dict() for c in categorias]), 200

@categorias_bp.route("", methods=["POST"])
@jwt_required()
def crear_categoria():
    usuario_id = int(get_jwt_identity())
    data = request.get_json(force=True, silent=True)
    if not data or not data.get("nombre"):
        return jsonify({"error": "Nombre requerido"}), 400
    categoria = Categoria(
        nombre=data["nombre"],
        tipo="personalizada",
        id_usuario=usuario_id
    )
    db.session.add(categoria)
    db.session.commit()
    return jsonify({"mensaje": "Categoría creada", "id": categoria.id}), 201

@categorias_bp.route("/<int:id>", methods=["PUT"])
@jwt_required()
def editar_categoria(id):
    usuario_id = int(get_jwt_identity())
    categoria = Categoria.query.get(id)

    if not categoria:
        return jsonify({"error": "Categoría no encontrada"}), 404
    if categoria.tipo == 'predeterminada':
        return jsonify({"error": "No puedes editar categorías predeterminadas"}), 403
    if categoria.id_usuario != usuario_id:
        return jsonify({"error": "No autorizado"}), 403

    data = request.get_json(force=True, silent=True)
    if not data or not data.get("nombre"):
        return jsonify({"error": "Nombre requerido"}), 400

    categoria.nombre = data["nombre"]
    db.session.commit()
    return jsonify({"mensaje": "Categoría actualizada"}), 200

@categorias_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def eliminar_categoria(id):
    usuario_id = int(get_jwt_identity())
    categoria = Categoria.query.get(id)

    if not categoria:
        return jsonify({"error": "Categoría no encontrada"}), 404
    if categoria.tipo == 'predeterminada':
        return jsonify({"error": "No puedes eliminar categorías predeterminadas"}), 403
    if categoria.id_usuario != usuario_id:
        return jsonify({"error": "No autorizado"}), 403

    # Verificar si tiene tareas asociadas
    from app.models.tarea import Tarea
    tareas_asociadas = Tarea.query.filter_by(id_categoria=id).count()
    if tareas_asociadas > 0:
        return jsonify({
            "error": f"No puedes eliminar esta categoría porque tiene {tareas_asociadas} tarea(s) asociada(s). Reasigna o elimina esas tareas primero."
        }), 409

    db.session.delete(categoria)
    db.session.commit()
    return jsonify({"mensaje": "Categoría eliminada"}), 200