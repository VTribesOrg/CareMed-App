import logging
import sys
from datetime import datetime
from app import app
from extensions import db
from models.product import Rental

logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
)
logger = logging.getLogger(__name__)

def generate_monthly_invoices():
    """
    Automatically generates recurring monthly invoices for active open-duration rentals
    when the current service period is nearing its end.
    """
    logger.info("Starting automated recurring invoice generation task.")
    
    with app.app_context():
        try:
            open_rentals = Rental.query.filter_by(status='Active', is_open_duration=True).all()
            generated_count = 0
            today = datetime.now().date()
            
            for rental in open_rentals:
                latest_invoice = rental.get_latest_invoice()
                if latest_invoice:
                    days_remaining = (latest_invoice.service_period_end - today).days
                    if days_remaining <= 3:
                        rental.generate_next_monthly_invoice()
                        generated_count += 1
                        
            db.session.commit()
            logger.info(f"Successfully generated {generated_count} recurring invoice(s).")
            
        except Exception as e:
            db.session.rollback()
            logger.exception(f"Critical error encountered while generating recurring invoices: {str(e)}")
        finally:
            db.session.remove()

if __name__ == '__main__':
    generate_monthly_invoices()