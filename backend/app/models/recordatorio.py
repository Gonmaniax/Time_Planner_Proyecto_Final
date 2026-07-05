from app.models.database import db

class Recordatorio(db.Model):
    __tablename__ = 'recordatorios'

    id = db.Column(db.Integer, primary_key=True)
    id_tarea = db.Column(db.Integer, db.ForeignKey('tareas.id'), nullable=False)
    fecha_hora = db.Column(db.DateTime, nullable=False)
    repetir_min = db.Column(db.Integer, nullable=True)  # null = no se repite
    activo = db.Column(db.Boolean, default=True, nullable=False)
    atendido = db.Column(db.Boolean, default=False, nullable=False)

    # relationship: nos permite hacer recordatorio.tarea.titulo sin escribir un JOIN a mano
    tarea = db.relationship(
        'Tarea',
        backref=db.backref('recordatorios', lazy=True, cascade='all, delete-orphan')
    )

    def to_dict(self):
        return {
            'id': self.id,
            'id_tarea': self.id_tarea,
            'titulo_tarea': self.tarea.titulo if self.tarea else None,
            'fecha_hora': self.fecha_hora.isoformat(),
            'repetir_min': self.repetir_min,
            'activo': self.activo,
            'atendido': self.atendido
        }