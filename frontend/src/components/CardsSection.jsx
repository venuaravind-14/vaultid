import React from 'react'

function CardsSection({ cards }) {
  const showQR = (cardId) => {
    // QR code display logic
    console.log('Show QR for card:', cardId)
  }

  return (
    <div className="section-view active" id="view-cards">
      <div className="section-header">
        <h2>ID Cards</h2>
        <button className="btn btn-primary">
          <span style={{marginRight: '8px'}}>+</span>
          Add Card
        </button>
      </div>

      <div className="cards-grid">
        {cards.length === 0 ? (
          <div className="empty-state">
            <div style={{fontSize: '48px', marginBottom: '16px'}}>💳</div>
            <h3>No ID Cards Yet</h3>
            <p>Add your first ID card to get started</p>
            <button className="btn btn-primary" style={{marginTop: '16px'}}>
              Add Your First Card
            </button>
          </div>
        ) : (
          cards.map(card => {
            const typeClass = {
              student: 'card-student',
              bus: 'card-bus',
              library: 'card-library',
              employee: 'card-employee',
              custom: 'card-custom',
              uploaded: 'card-uploaded'
            }[card.card_type] || 'card-custom'

            return (
              <div
                key={card.id}
                className={`id-card-widget ${typeClass}`}
                onClick={() => showQR(card.id)}
              >
                <div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px'}}>
                    <span className="card-badge">{card.card_type.toUpperCase()}</span>
                  </div>

                  {card.card_image_path && (
                    <div className="card-img-preview">
                      <img
                        src={`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}${card.card_image_path}`}
                        alt="Card"
                        onError={(e) => e.target.parentElement.style.display = 'none'}
                      />
                    </div>
                  )}

                  <div className="card-content">
                    <div className="card-title">ID Card</div>
                    <div className="card-subtitle">Tap to show QR code</div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default CardsSection