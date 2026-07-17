"""
QR Code and Barcode generation services.
"""
import io
import base64
import qrcode
from qrcode.image.svg import SvgImage


def generate_qr_base64(data: str, box_size: int = 8, border: int = 2) -> str:
    """Generate a QR code and return as base64-encoded PNG string."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    encoded = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return f'data:image/png;base64,{encoded}'


def generate_barcode_base64(code: str) -> str:
    """Generate a Code128 barcode and return as base64-encoded PNG string."""
    try:
        import barcode
        from barcode.writer import ImageWriter
        code128 = barcode.get('code128', code, writer=ImageWriter())
        buffer = io.BytesIO()
        code128.write(buffer, options={'write_text': True, 'module_height': 8})
        buffer.seek(0)
        encoded = base64.b64encode(buffer.getvalue()).decode('utf-8')
        return f'data:image/png;base64,{encoded}'
    except Exception:
        return ''
