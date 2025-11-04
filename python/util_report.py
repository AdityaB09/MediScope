from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm

def render_pdf(path, header, patient, prob, label, contribs):
    c = canvas.Canvas(path, pagesize=A4)
    w, h = A4
    y = h - 2*cm
    c.setFont("Helvetica-Bold", 16); c.drawString(2*cm, y, header); y -= 1.2*cm
    c.setFont("Helvetica", 10)
    c.drawString(2*cm, y, f"Risk: {label} ({prob*100:.1f}%)"); y -= .6*cm
    c.drawString(2*cm, y, "Patient Features:"); y -= .5*cm
    for k,v in patient.items():
        c.drawString(2.5*cm, y, f"{k}: {v}"); y -= .45*cm
        if y < 3*cm: c.showPage(); y = h - 2*cm
    c.drawString(2*cm, y, "Top SHAP Contributions:"); y -= .5*cm
    top = sorted(contribs.items(), key=lambda x: abs(x[1]), reverse=True)[:10]
    for k,v in top:
        c.drawString(2.5*cm, y, f"{k}: {v:+.4f}"); y -= .45*cm
        if y < 3*cm: c.showPage(); y = h - 2*cm
    c.showPage(); c.save()
