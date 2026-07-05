from app.models.database import db

class SesionCronometro(db.Model):
    __tablename__ = "sesiones_cronometro"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_tarea = db.Column(db.Integer, db.ForeignKey("tareas.id"), nullable=False)
    inicio = db.Column(db.DateTime, nullable=False)
    fin = db.Column(db.DateTime, nullable=False)
    duracion_min = db.Column(db.Integer, nullable=False)
    resultado = db.Column(
        db.Enum("completada", "tiempo_extra", "interrumpida"),
        default="completada"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "id_tarea": self.id_tarea,
            "inicio": str(self.inicio),
            "fin": str(self.fin),
            "duracion_min": self.duracion_min,
            "resultado": self.resultado
        }