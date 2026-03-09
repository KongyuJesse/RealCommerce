function MarketplaceCard({ card }) {
  return (
    <article className="market-card">
      <h2>{card.title}</h2>

      {card.type === 'mosaic' ? (
        <div className="market-card-mosaic">
          {card.items.map((item) => (
            <div className="market-card-mosaic-item" key={`${card.id}-${item.title}`}>
              <img src={item.imageUrl} alt={item.alt} loading="lazy" />
              <span>{item.title}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="market-card-single">
          <img src={card.imageUrl} alt={card.alt} loading="lazy" />
        </div>
      )}

      <a className="market-card-link" href="#shop">
        {card.linkLabel}
      </a>
    </article>
  );
}

export default MarketplaceCard;
