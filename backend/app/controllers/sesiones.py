from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.database import db
from app.models.sesion_cronometro import SesionCronometro
from app.models.tarea import Tarea
from datetime import datetime

sesiones_bp = Blueprint("sesiones", __name__)

@sesiones_bp.route("", methods=["POST"])
@jwt_required()
def crear_sesion():
    usuario_id = int(get_jwt_identity())
    data = request.get_json()

    tarea = Tarea.query.filter_by(
        id=data.get("id_tarea"),
        id_usuario=usuario_id
    ).first()

    if not tarea:
        return jsonify({"error": "Tarea no encontrada"}), 404

    sesion = SesionCronometro(
        id_tarea=data["id_tarea"],
        inicio=datetime.fromisoformat(data["inicio"]),
        fin=datetime.fromisoformat(data["fin"]),
        duracion_min=data["duracion_min"],
        resultado=data["resultado"]
    )
    db.session.add(sesion)

    if data["resultado"] == "completada":
        tarea.estado = "completada"
        tarea.tiempo_real_min = data["duracion_min"]

    db.session.commit()
    return jsonify({"mensaje": "Sesión guardada"}), 201

@sesiones_bp.route("/hoy", methods=["GET"])
@jwt_required()
def get_sesiones_hoy():
    usuario_id = int(get_jwt_identity())
    from datetime import date
    hoy = date.today()
    tareas_ids = [t.id for t in Tarea.query.filter_by(id_usuario=usuario_id).all()]
    sesiones = SesionCronometro.query.filter(
        SesionCronometro.id_tarea.in_(tareas_ids),
        db.func.date(SesionCronometro.inicio) == hoy
    ).all()
    return jsonify([s.to_dict() for s in sesiones]), 200

@sesiones_bp.route("/hoy", methods=["DELETE"])
@jwt_required()
def eliminar_sesiones_hoy():
    usuario_id = int(get_jwt_identity())
    from datetime import date
    hoy = date.today()
    filtro = request.args.get("tipo")  # completada, interrumpida, tiempo_extra, o None para todas
    
    tareas_ids = [t.id for t in Tarea.query.filter_by(id_usuario=usuario_id).all()]
    query = SesionCronometro.query.filter(
        SesionCronometro.id_tarea.in_(tareas_ids),
        db.func.date(SesionCronometro.inicio) == hoy
    )
    if filtro:
        query = query.filter(SesionCronometro.resultado == filtro)
    
    eliminadas = query.count()
    query.delete(synchronize_session=False)
    db.session.commit()
    return jsonify({"mensaje": f"{eliminadas} sesiones eliminadas"}), 200