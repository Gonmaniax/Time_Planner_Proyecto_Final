from flask import Blueprint, request, jsonify, current_app
from flask_mail import Message
from datetime import datetime, timedelta
import random
import threading

from app.models.database import db
from app.models.usuario import Usuario
from app.controllers.auth import hash_password
import os

recuperacion_bp = Blueprint('recuperacion_bp', __name__)


def _enviar_correo_async(app, msg):
    """Envía el correo en segundo plano para no bloquear la respuesta HTTP.
    Necesita su propio app_context porque corre en un hilo distinto."""
    from app.extensions import mail
    with app.app_context():
        try:
            mail.send(msg)
        except Exception as e:
            # Si falla el envío en segundo plano, al menos queda en el log del servidor.
            # El usuario ya recibió "código enviado", así que si de verdad falló
            # el correo, no lo sabrá hasta que intente verificar el código.
            print(f"[recuperacion] Error enviando correo a {msg.recipients}: {e}")


@recuperacion_bp.route('/solicitar', methods=['POST'])
def solicitar_codigo():
    print(">>> VERSION NUEVA - solicitar_codigo ejecutándose")
    datos = request.get_json() or {}
    correo = (datos.get('correo') or '').strip()

    if not correo:
        return jsonify({"error": "Debes indicar tu correo"}), 400

    usuario = Usuario.query.filter_by(correo=correo).first()
    if not usuario:
        return jsonify({"error": "No existe una cuenta con ese correo"}), 404

    codigo = str(random.randint(100000, 999999))
    usuario.codigo_recuperacion = codigo
    usuario.codigo_expira = datetime.utcnow() + timedelta(minutes=15)
    db.session.commit()

    msg = Message(
        subject="Time Planner — Código de recuperación",
        sender=os.getenv("MAIL_USERNAME"),
        recipients=[correo],
        body=f"Tu código de recuperación es: {codigo}\n\nEste código vence en 15 minutos."
    )

    # Se dispara en un hilo aparte: la respuesta al frontend no espera
    # a que termine la conexión SMTP con Mailtrap.
    threading.Thread(
        target=_enviar_correo_async,
        args=(current_app._get_current_object(), msg),
        daemon=True
    ).start()

    return jsonify({"mensaje": "Código enviado correctamente"}), 200


@recuperacion_bp.route('/verificar', methods=['POST'])
def verificar_codigo():
    datos = request.get_json() or {}
    correo = (datos.get('correo') or '').strip()
    codigo = (datos.get('codigo') or '').strip()

    usuario = Usuario.query.filter_by(correo=correo).first()
    if not usuario or not usuario.codigo_recuperacion:
        return jsonify({"error": "Solicita un código primero"}), 400

    if usuario.codigo_expira < datetime.utcnow():
        return jsonify({"error": "El código ha expirado, solicita uno nuevo"}), 400

    if usuario.codigo_recuperacion != codigo:
        return jsonify({"error": "Código incorrecto"}), 400

    return jsonify({"mensaje": "Código válido"}), 200


@recuperacion_bp.route('/resetear', methods=['POST'])
def resetear_contrasena():
    datos = request.get_json() or {}
    correo = (datos.get('correo') or '').strip()
    codigo = (datos.get('codigo') or '').strip()
    nueva = datos.get('nueva', '')

    usuario = Usuario.query.filter_by(correo=correo).first()
    if not usuario or not usuario.codigo_recuperacion:
        return jsonify({"error": "Solicita un código primero"}), 400

    if usuario.codigo_expira < datetime.utcnow():
        return jsonify({"error": "El código ha expirado, solicita uno nuevo"}), 400

    if usuario.codigo_recuperacion != codigo:
        return jsonify({"error": "Código incorrecto"}), 400

    if len(nueva) < 6:
        return jsonify({"error": "La nueva contraseña debe tener al menos 6 caracteres"}), 400

    nuevo_salt = os.urandom(16).hex()
    usuario.salt = nuevo_salt
    usuario.contrasena_hash = hash_password(nueva, nuevo_salt)
    usuario.codigo_recuperacion = None
    usuario.codigo_expira = None
    db.session.commit()

    return jsonify({"mensaje": "Contraseña actualizada correctamente"}), 200