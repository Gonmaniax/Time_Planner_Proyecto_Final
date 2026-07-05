from app.models.database import db
from datetime import datetime

class Tarea(db.Model):
    __tablename__ = "tareas"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_usuario = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    id_categoria = db.Column(db.Integer, db.ForeignKey("categorias.id"), nullable=True)
    titulo = db.Column(db.String(200), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    prioridad = db.Column(db.Enum("alta","media","baja"), default="media")
    estado = db.Column(db.Enum("pendiente","en_progreso","completada"), default="pendiente")
    tiempo_estimado_min = db.Column(db.Integer, nullable=False)
    tiempo_real_min = db.Column(db.Integer, default=0)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_limite = db.Column(db.DateTime, nullable=True)
    fecha_completada = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "id_usuario": self.id_usuario,
            "id_categoria": self.id_categoria,
            "titulo": self.titulo,
            "descripcion": self.descripcion,
            "prioridad": self.prioridad,
            "estado": self.estado,
            "tiempo_estimado_min": self.tiempo_estimado_min,
            "tiempo_real_min": self.tiempo_real_min,
            "fecha_creacion": str(self.fecha_creacion),
            "fecha_limite": self.fecha_limite.strftime('%Y-%m-%d') if self.fecha_limite else None
        }