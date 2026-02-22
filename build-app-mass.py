import os

with open("src/App.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == "import './App.css';":
        new_lines.append("import './AppMass.css';\n")
    elif line.strip() == "function App() {":
        new_lines.append("export default function AppMass() {\n")
    elif line.strip() == "export default App;":
        pass
    else:
        new_lines.append(line)

return_start = -1
for i, line in enumerate(new_lines):
    if "return (" in line and i + 1 < len(new_lines) and "className=\"app-shell\"" in new_lines[i+1]:
        return_start = i
        break

if return_start == -1:
    print("Could not find start of return block!")
    exit(1)

header_part = new_lines[:return_start]

custom_jsx = """  return (
    <div className="mass-shell">
      <header className="mass-hero">
        <h1>Texas Scratch-Off Guide</h1>
        <p>Find the best tickets in your area right now.</p>
        
        <div className="mass-hero-stats">
          <div className="mass-stat">
            <span className="label">Tickets Tracked</span>
            <span className="val">{number.format(dataset.summary.totalGames)}</span>
          </div>
          <div className="mass-stat">
            <span className="label">Jackpots Left</span>
            <span className="val">{number.format(totalRemainingTopPrizes)}</span>
          </div>
        </div>
      </header>

      <section className="mass-card">
        <h2>Find Your Game</h2>
        <div className="mass-controls-grid">
          <div className="mass-input-group">
            <label>Search for a Ticket (Optional)</label>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. 50X Cash, 2404..." />
          </div>
          
          <div className="mass-input-group">
            <label>Your Zip Code</label>
            <div className="mass-row-flex">
              <input type="text" value={zipCode} maxLength={5} style={{maxWidth: "150px"}}
                onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="77002" />
              <button 
                className={`mass-pill ${localSort ? 'active-alt' : ''}`}
                onClick={() => setLocalSort(v => !v)}>
                {localSort ? 'Check Stores Near Me' : 'Statewide Only'}
              </button>
            </div>
            <p style={{fontSize: "0.85rem", marginTop: "4px"}}>Type in your zip code to prioritize tickets hitting big at local H-E-B and gas stations.</p>
          </div>
        </div>
      </section>

      <section className="mass-card">
        <h2>Set Your Strategy</h2>
        <div className="mass-controls-grid">
          <div className="mass-input-group">
            <label>Ticket Price</label>
            <div className="mass-pills">
              <button className={`mass-pill ${selectedPrice === 'all' ? 'active' : ''}`} onClick={() => setSelectedPrice('all')}>Show All</button>
              {dataset.summary.ticketPrices.map(p => (
                <button key={p} className={`mass-pill ${selectedPrice === p ? 'active' : ''}`} onClick={() => setSelectedPrice(p)}>${p}</button>
              ))}
            </div>
          </div>

          <div className="mass-input-group">
            <label>What do you want to win?</label>
            <div className="mass-pills">
              <button className={`mass-pill ${objectiveMode === 'probability10x' ? 'active-alt' : ''}`} onClick={() => setObjectiveMode('probability10x')}>Good Payout ($50+)</button>
              <button className={`mass-pill ${objectiveMode === 'jackpotTop' ? 'active-alt' : ''}`} onClick={() => setObjectiveMode('jackpotTop')}>The Grand Prize</button>
              <button className={`mass-pill ${objectiveMode === 'bestReturn' ? 'active-alt' : ''}`} onClick={() => setObjectiveMode('bestReturn')}>Best Math ROI</button>
            </div>
          </div>
        </div>

        {bestGame && (
          <div className="mass-alert">
            <p>
              🌟 <strong>TOP PICK RIGHT NOW:</strong><br/>
              Grab <strong>{bestGame.gameName}</strong>! Its current rating is <strong>{objectiveMode === 'bestReturn' ? `${formatPerDollar(rankingReturnForGame(bestGame))} EV` : formatOdds(rankingOddsForGame(bestGame))}</strong>.
            </p>
          </div>
        )}
      </section>

      <div className="mass-tab-nav">
        <button className={workspaceView === 'buy' ? 'active' : ''} onClick={() => setWorkspaceView('buy')}>My Budget</button>
        <button className={workspaceView === 'rank' ? 'active' : ''} onClick={() => setWorkspaceView('rank')}>All Rankings</button>
      </div>

      {workspaceView === 'buy' && (
        <section>
          <h2>How to Spend Your Money</h2>
          <p>Pick your budget below to see exactly which tickets to buy at the counter.</p>
          
          <div className="mass-input-group" style={{background: "var(--tx-bg)", padding: "16px", borderRadius: "12px", border: "1px solid var(--tx-border)"}}>
            <label style={{display: "block", marginBottom: "8px", color: "var(--tx-navy)"}}>Got a specific amount of cash?</label>
            <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
              <span style={{fontSize: "1.2rem", fontWeight: 700, color: "var(--tx-navy)"}}>$</span>
              <input type="text" value={customBudgetInput} onChange={(e) => {
                const next = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCustomBudgetInput(next);
                if (!next) return;
                const parsed = Number.parseInt(next, 10);
                if (Number.isFinite(parsed) && parsed > 0) setEvPreviewBudget(Math.min(parsed, 500));
              }} placeholder="e.g. 15" style={{maxWidth: "100px", padding: "10px", fontSize: "1.2rem", textAlign: "center", borderRadius: "8px", border: "1px solid var(--tx-border)"}} />
              {customBudgetValue ? <span style={{fontWeight: 700, color: "var(--tx-red)"}}>Custom budget added!</span> : <span style={{fontSize: "0.85rem", color: "var(--tx-muted)"}}>Enter a custom amount to generate a plan.</span>}
            </div>
          </div>

          <div className="mass-result-list">
            {displayedBudgetPlans.map(({budget, finalPlan: plan}) => (
              <div key={budget} className={`mass-item-card ${plan && budget >= (bestGame?.ticketPrice ?? 9999) ? 'highlighted' : ''}`}>
                <div className="mass-item-header">
                  <h3>If you have {currency.format(budget)}</h3>
                </div>
                
                {plan ? (
                  <>
                    <div className="mass-buy-list">
                      🛒 Buying list: {plan.lines.map((line) => `${line.ticketCount}x ${line.game.gameName}`).join(', ')}
                    </div>
                    
                    <div className="mass-metric-row"><span className="mass-metric-label">Total Cost</span><span className="mass-metric-value">{currency.format(plan.spent)}</span></div>
                    {plan.recommendationTarget === 'expectedValue' ? (
                      <>
                        <div className="mass-metric-row"><span className="mass-metric-label">Estimated Payout</span><span className="mass-metric-value good">{formatDollars(plan.estimatedExpectedPayout)}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="mass-metric-row"><span className="mass-metric-label">Chance to Win Focus Prize</span><span className="mass-metric-value good">{percentage.format(plan.estimatedPrimaryChance)}</span></div>
                        <div className="mass-metric-row"><span className="mass-metric-label">Chance of a Jackpot</span><span className="mass-metric-value accent">{percentage.format(plan.estimatedTopPrizeChance)}</span></div>
                      </>
                    )}
                  </>
                ) : (
                  <p style={{margin: 0, padding: "16px 0", textAlign: "center", fontWeight: "bold"}}>Not enough money for these filters.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {workspaceView === 'rank' && (
        <section>
          <h2>Ticket Leaderboard</h2>
          <p>The math behind the rankings.</p>
          
          <div className="mass-result-list">
            {rankedGames.slice(0, 50).map((game, i) => {
              const rScore = rankingScoreForGame(game);
              const scoreStr = objectiveMode === 'bestReturn' ? (rScore ? formatPerDollar(rScore) : 'N/A') : (rScore ? formatOdds(probabilityToOdds(rScore)) : 'N/A');
              
              return (
                <div key={game.gameNumber} className="mass-item-card">
                  <div className="mass-item-header">
                    <div>
                      <span style={{color: "var(--tx-red)", fontWeight: 900, marginRight: "8px"}}>#{i + 1}</span>
                      <h3 style={{display: "inline"}}>{game.gameName}</h3>
                      <p style={{margin: "4px 0 0 0", fontSize: "0.85rem"}}>Ticket ID: {game.gameNumber}</p>
                    </div>
                    <div className="mass-price-badge">{currency.format(game.ticketPrice)}</div>
                  </div>
                  
                  <div className="mass-metric-row">
                    <span className="mass-metric-label">Grand Prize</span>
                    <span className="mass-metric-value">{formatDollars(game.topPrizeAmount)}</span>
                  </div>
                  <div className="mass-metric-row">
                    <span className="mass-metric-label">Grand Prizes Left</span>
                    <span className="mass-metric-value">{number.format(game.topPrizesRemaining)} out there</span>
                  </div>
                  <div className="mass-metric-row" style={{background: "var(--tx-bg)", padding: "12px", borderRadius: "8px", marginTop: "8px"}}>
                    <span className="mass-metric-label" style={{color: "var(--tx-navy)"}}>Current Rating</span>
                    <span className="mass-metric-value good" style={{color: "var(--tx-navy)"}}>{scoreStr}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

    </div>
  );
}
"""

with open("src/AppMass.tsx", "w") as f:
    f.writelines(header_part)
    f.write(custom_jsx)

print("Generated src/AppMass.tsx successfully.")
