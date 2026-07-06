from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from app.models.database import db
from app.models.recordatorio import Recordatorio
from app.models.tarea import Tarea

recordatorios_bp = Blueprint('recordatorios', __name__)

def _recordatorio_de_usuario(id_recordatorio, id_usuario):
    recordatorio = Recordatorio.query.get(id_recordatorio)
    if not recordatorio or recordatorio.tarea.id_usuario != id_usuario:
        return None
    return recordatorio

@recordatorios_bp.route('', methods=['POST'])
@jwt_required()
def crear_recordatorio():
    id_usuario = int(get_jwt_identity())
    datos = request.get_json()
    tarea = Tarea.query.get(datos.get('id_tarea'))
    if not tarea or tarea.id_usuario != id_usuario:
        return jsonify({'error': 'Tarea no encontrada'}), 404

    ya_existe = Recordatorio.query.filter_by(
        id_tarea=tarea.id,
        activo=True
    ).first()
    if ya_existe:
        return jsonify({'error': 'Esta tarea ya tiene un recordatorio activo'}), 400

   try:
    fecha_hora = datetime.fromisoformat(datos['fecha_hora'])
    ahora_colombia = datetime.utcnow() - timedelta(hours=5)
    if fecha_hora <= ahora_colombia:
        return jsonify({'error': 'La fecha debe ser en el futuro'}), 400
except (KeyError, ValueError):
    return jsonify({'error': 'fecha_hora inválida'}), 400

    nuevo = Recordatorio(
        id_tarea=tarea.id,
        fecha_hora=fecha_hora,
        repetir_min=datos.get('repetir_min'),
    )
    db.session.add(nuevo)
    db.session.commit()
    return jsonify(nuevo.to_dict()), 201

@recordatorios_bp.route('', methods=['GET'])
@jwt_required()
def listar_recordatorios():
    id_usuario = int(get_jwt_identity())
    recordatorios = (
        Recordatorio.query.join(Tarea)
        .filter(
            Tarea.id_usuario == id_usuario,
            Recordatorio.activo.is_(True),   
        )
        .order_by(Recordatorio.fecha_hora.asc())
        .all()
    )
    return jsonify([r.to_dict() for r in recordatorios])

@recordatorios_bp.route('/pendientes', methods=['GET'])
@jwt_required()
def recordatorios_pendientes():
    id_usuario = int(get_jwt_identity())
    ahora_str = request.args.get('ahora')
    try:
        ahora = datetime.fromisoformat(ahora_str) if ahora_str else datetime.now()
    except ValueError:
        ahora = datetime.now()

    pendientes = (
        Recordatorio.query.join(Tarea)
        .filter(
            Tarea.id_usuario == id_usuario,
            Recordatorio.activo.is_(True),
            Recordatorio.atendido.is_(False),
            Recordatorio.fecha_hora <= ahora,
        )
        .all()
    )

    vencidos = (
        Recordatorio.query.join(Tarea)
        .filter(
            Tarea.id_usuario == id_usuario,
            Recordatorio.activo.is_(True),
            Recordatorio.repetir_min.is_(None),
            Recordatorio.fecha_hora < ahora,
        )
        .all()
    )
    for r in vencidos:
        r.activo = False
    if vencidos:
        db.session.commit()

    return jsonify([r.to_dict() for r in pendientes])
        

@recordatorios_bp.route('/<int:id_recordatorio>', methods=['PUT'])
@jwt_required()
def actualizar_recordatorio(id_recordatorio):
    id_usuario = int(get_jwt_identity())
    recordatorio = _recordatorio_de_usuario(id_recordatorio, id_usuario)
    if not recordatorio:
        return jsonify({'error': 'Recordatorio no encontrado'}), 404
    datos = request.get_json()
    accion = datos.get('accion')
    if accion == 'posponer':
            minutos = recordatorio.repetir_min or 5  # si no puso nada, 5 min por defecto (como las alarmas del celular)
            recordatorio.fecha_hora = datetime.now() + timedelta(minutes=minutos)
            recordatorio.atendido = False
    elif accion == 'finalizar':
        recordatorio.atendido = True
        recordatorio.activo = False
    elif accion == 'desactivar':
        recordatorio.activo = False
    else:
        if 'fecha_hora' in datos:
            recordatorio.fecha_hora = datetime.fromisoformat(datos['fecha_hora'])
        if 'repetir_min' in datos:
            recordatorio.repetir_min = datos['repetir_min']
        if 'activo' in datos:
            recordatorio.activo = datos['activo']
    db.session.commit()
    return jsonify(recordatorio.to_dict())

@recordatorios_bp.route('/<int:id_recordatorio>', methods=['DELETE'])
@jwt_required()
def eliminar_recordatorio(id_recordatorio):
    id_usuario = int(get_jwt_identity())
    recordatorio = _recordatorio_de_usuario(id_recordatorio, id_usuario)
    if not recordatorio:
        return jsonify({'error': 'Recordatorio no encontrado'}), 404
    db.session.delete(recordatorio)
    db.session.commit()
    return jsonify({'mensaje': 'Recordatorio eliminado'})
