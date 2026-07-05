from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.database import db
from app.models.tarea import Tarea
from app.models.categoria import Categoria
from datetime import datetime, date

tareas_bp = Blueprint("tareas", __name__)

@tareas_bp.route("", methods=["GET"])
@jwt_required()
def get_tareas():
    usuario_id = int(get_jwt_identity())
    tareas = Tarea.query.filter_by(id_usuario=usuario_id).all()
    resultado = []
    for t in tareas:
        d = t.to_dict()
        if t.id_categoria:
            cat = Categoria.query.get(t.id_categoria)
            d["categoria_nombre"] = cat.nombre if cat else None
        else:
            d["categoria_nombre"] = None
        resultado.append(d)
    return jsonify(resultado), 200

@tareas_bp.route("/hoy", methods=["GET"])
@jwt_required()
def get_tareas_hoy():
    usuario_id = int(get_jwt_identity())
    hoy = date.today()
    tareas = Tarea.query.filter_by(id_usuario=usuario_id).all()
    resultado = []
    for t in tareas:
        if t.fecha_creacion and t.fecha_creacion.date() == hoy:
            d = t.to_dict()
            if t.id_categoria:
                cat = Categoria.query.get(t.id_categoria)
                d["categoria_nombre"] = cat.nombre if cat else None
            else:
                d["categoria_nombre"] = None
            resultado.append(d)
    return jsonify(resultado), 200

@tareas_bp.route("", methods=["POST"])
@jwt_required()
def create_tarea():
    usuario_id = int(get_jwt_identity())
    data = request.get_json()
    tarea = Tarea(
        id_usuario=usuario_id,
        id_categoria=data.get("id_categoria"),
        titulo=data["titulo"],
        descripcion=data.get("descripcion"),
        prioridad=data.get("prioridad", "media"),
        tiempo_estimado_min=data["tiempo_estimado_min"],
        fecha_limite=datetime.strptime(data["fecha_limite"], "%Y-%m-%d") if data.get("fecha_limite") else None
    )
    db.session.add(tarea)
    db.session.commit()
    return jsonify({"mensaje": "Tarea creada", "id": tarea.id}), 201

@tareas_bp.route("/<int:id>", methods=["PUT"])
@jwt_required()
def update_tarea(id):
    usuario_id = int(get_jwt_identity())
    tarea = Tarea.query.filter_by(id=id, id_usuario=usuario_id).first()
    if not tarea:
        return jsonify({"error": "Tarea no encontrada"}), 404
    data = request.get_json()
    tarea.titulo = data.get("titulo", tarea.titulo)
    tarea.descripcion = data.get("descripcion", tarea.descripcion)
    tarea.id_categoria = data.get("id_categoria", tarea.id_categoria)
    tarea.prioridad = data.get("prioridad", tarea.prioridad)
    tarea.tiempo_estimado_min = data.get("tiempo_estimado_min", tarea.tiempo_estimado_min)

    if 'estado' in data:
        tarea.estado = data['estado']
        if data['estado'] == 'completada':
            tarea.fecha_completada = datetime.now()
        elif data['estado'] == 'pendiente':
            tarea.fecha_completada = None

    if data.get("fecha_limite"):
        fecha_str = data["fecha_limite"].split(" ")[0].split("T")[0]
        tarea.fecha_limite = datetime.strptime(fecha_str, "%Y-%m-%d")

    db.session.commit()
    return jsonify({"mensaje": "Tarea actualizada"}), 200

@tareas_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_tarea(id):
    usuario_id = int(get_jwt_identity())
    tarea = Tarea.query.filter_by(id=id, id_usuario=usuario_id).first()
    if not tarea:
        return jsonify({"error": "Tarea no encontrada"}), 404
    
    # Borrar sesiones asociadas primero
    from app.models.sesion_cronometro import SesionCronometro
    SesionCronometro.query.filter_by(id_tarea=id).delete()
    
    db.session.delete(tarea)
    db.session.commit()
    return jsonify({"mensaje": "Tarea eliminada"}), 200