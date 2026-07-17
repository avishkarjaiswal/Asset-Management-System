from datetime import datetime, date

def parse_date(date_val):
    import pandas as pd
    if date_val is None or pd.isna(date_val):
        return None
    
    if isinstance(date_val, datetime):
        return date_val.date()
    if isinstance(date_val, date):
        return date_val
        
    try:
        if hasattr(date_val, 'date') and callable(getattr(date_val, 'date')):
            return date_val.date()
            
        date_str = str(date_val).strip()
        if not date_str:
            return None
            
        # Handle ISO format strings like '2026-01-01T00:00:00'
        if 'T' in date_str:
            date_str = date_str.split('T')[0]
        # Handle '2026-01-01 00:00:00'
        elif ' ' in date_str:
            date_str = date_str.split(' ')[0]
            
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except Exception:
        return None
