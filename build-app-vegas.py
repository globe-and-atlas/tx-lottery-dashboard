import os

with open("src/App.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == "import './App.css';":
        new_lines.append("import './AppVegas.css';\n")
    elif line.strip() == "function App() {":
        new_lines.append("export default function AppVegas() {\n")
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
    <div className="veg-shell">
      <header className="veg-header">
        <h1>HIGH ROLLER</h1>
        <p>CASINO-GRADE SCRATCH TICKET ANALYTICS</p>
        <div className="veg-marquee-lights">
          <div className="veg-bulb"></div>
          <div className="veg-bulb"></div>
          <div className="veg-bulb"></div>
          <div className="veg-bulb"></div>
          <div className="veg-bulb"></div>
        </div>
      </header>

      <div className="veg-panel">
        <h2>PLACE YOUR BETS</h2>

        <div className="veg-control-group">
          <label>YOUR LOCATION (ZIP)</label>
          <div style={{display: "flex", gap: "12px", alignItems: "center", justifyContent: "center"}}>
            <input className="veg-input" type="text" value={zipCode} maxLength={5} style={{width: "140px"}}
              onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="77002" />
            <button 
              className={`veg-chip ${localSort ? 'active' : ''}`}
              onClick={() => setLocalSort(v => !v)}>
              {localSort ? 'LOCAL DEALER' : 'STATEWIDE FLOOR'}
            </button>
          </div>
        </div>

        <div className="veg-control-group">
          <label>TABLE LIMIT (TICKET PRICE)</label>
          <div className="veg-chips">
            <button className={`veg-chip ${selectedPrice === 'all' ? 'active' : ''}`} onClick={() => setSelectedPrice('all')}>NO LIMIT</button>
            {dataset.summary.ticketPrices.map(p => (
              <button key={p} className={`veg-chip ${selectedPrice === p ? 'active' : ''}`} onClick={() => setSelectedPrice(p)}>${p}</button>
            ))}
          </div>
        </div>

        <div className="veg-control-group">
          <label>WIN CONDITION</label>
          <div className="veg-chips" style={{marginBottom: "16px"}}>
            <button className={`veg-chip ${objectiveMode === 'probability10x' ? 'active' : ''}`} onClick={() => setObjectiveMode('probability10x')}>SOLID RETURN</button>
            <button className={`veg-chip ${objectiveMode === 'jackpotTop' ? 'active' : ''}`} onClick={() => setObjectiveMode('jackpotTop')}>JACKPOT ONLY</button>
            <button className={`veg-chip ${objectiveMode === 'bestReturn' ? 'active' : ''}`} onClick={() => setObjectiveMode('bestReturn')}>HOUSE ADVANTAGE (EV)</button>
          </div>
          {objectiveMode === 'probability10x' && (
            <div style={{background: "var(--veg-bg)", padding: "16px", borderRadius: "12px", border: "1px solid var(--veg-border)", marginTop: "12px", textAlign: "center"}}>
              <label>PAYOUT MULTIPLIER</label>
              <div className="veg-chips">
                {[2, 3, 5, 10, 20, 50].map(multiplier => (
                  <button 
                    key={multiplier} 
                    className={`veg-chip ${targetPrizeMultiplier === multiplier ? 'active' : ''}`} 
                    onClick={() => setTargetPrizeMultiplier(multiplier)}
                    style={{padding: "8px 12px", fontSize: "0.9rem"}}>
                    {multiplier}x PLAY
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {bestGame && (
          <div className="veg-alert">
            <div className="veg-alert-title">HOT STREAK DETECTED</div>
            <div className="veg-alert-text">
              Bet on <strong>{bestGame.gameName}</strong>! True Odds: <strong>{objectiveMode === 'bestReturn' ? `${formatPerDollar(rankingReturnForGame(bestGame))} EV` : formatOdds(rankingOddsForGame(bestGame))}</strong>.
            </div>
          </div>
        )}
      </div>

      <div className="veg-tabs">
        <button className={workspaceView === 'buy' ? 'active' : ''} onClick={() => setWorkspaceView('buy')}>PARLAYS (BUDGET)</button>
        <button className={workspaceView === 'rank' ? 'active' : ''} onClick={() => setWorkspaceView('rank')}>ALL TABLES (RANKED)</button>
      </div>

      {workspaceView === 'buy' && (
        <div>
          <div className="veg-panel" style={{marginBottom: "24px", padding: "16px"}}>
            <label style={{textAlign: "center", display: "block", marginBottom: "8px"}}>CUSTOM BUY-IN</label>
            <div style={{display: "flex", justifyContent: "center", alignItems: "center", gap: "12px"}}>
              <span style={{fontSize: "1.8rem", fontWeight: 900, color: "var(--veg-accent-gold)"}}>$</span>
              <input type="text" value={customBudgetInput} onChange={e => {
                const next = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCustomBudgetInput(next);
                if (!next) return;
                const parsed = Number.parseInt(next, 10);
                if (Number.isFinite(parsed) && parsed > 0) setEvPreviewBudget(Math.min(parsed, 500));
              }} placeholder="0" className="veg-input" style={{width: "120px", textAlign: "center", fontSize: "1.5rem"}} />
            </div>
          </div>

          {displayedBudgetPlans.map(({budget, finalPlan: plan}) => (
            <div key={budget} className={`veg-card ${plan && budget >= (bestGame?.ticketPrice ?? 9999) ? 'highlight' : ''}`}>
              <div className="veg-card-header">BUY-IN: {currency.format(budget)}</div>
              <div className="veg-card-content">
                {plan ? (
                  <>
                    <div className="veg-picks-list">
                      {plan.lines.map((line) => `${line.ticketCount}x ${line.game.gameName}`).join(' ♠️ ')}
                    </div>
                    
                    <div className="veg-metric-row"><span className="veg-metric-label">WAGER</span><span className="veg-metric-val">{currency.format(plan.spent)}</span></div>
                    {plan.recommendationTarget === 'expectedValue' ? (
                      <>
                        <div className="veg-metric-row"><span className="veg-metric-label">EST VALUE</span><span className="veg-metric-val good">{formatDollars(plan.estimatedExpectedPayout)}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="veg-metric-row"><span className="veg-metric-label">WIN PROBABILITY</span><span className="veg-metric-val good">{percentage.format(plan.estimatedPrimaryChance)}</span></div>
                        <div className="veg-metric-row"><span className="veg-metric-label">JACKPOT HIT %</span><span className="veg-metric-val">{percentage.format(plan.estimatedTopPrizeChance)}</span></div>
                      </>
                    )}
                  </>
                ) : (
                  <div style={{textAlign: "center", color: "var(--veg-text-muted)", fontWeight: "800"}}>INSUFFICIENT FUNDS TO PLAY THESE FILTERS.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {workspaceView === 'rank' && (
        <div>
          {rankedGames.slice(0, 50).map((game, i) => {
            const rScore = rankingScoreForGame(game);
            const scoreStr = objectiveMode === 'bestReturn' ? (rScore ? formatPerDollar(rScore) : 'N/A') : (rScore ? formatOdds(probabilityToOdds(rScore)) : 'N/A');
            
            return (
              <div key={game.gameNumber} className="veg-rank-item">
                <div className="veg-rank-number">{i + 1}</div>
                <div style={{flex: 1}}>
                  <div className="veg-rank-title">{game.gameName}</div>
                  <div className="veg-rank-meta">GRAND PRIZE: {formatDollars(game.topPrizeAmount)} | BUY-IN: {currency.format(game.ticketPrice)}</div>
                </div>
                <div className="veg-rank-score">{scoreStr}</div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  );
}
"""

with open("src/AppVegas.tsx", "w") as f:
    f.writelines(header_part)
    f.write(custom_jsx)

print("Generated src/AppVegas.tsx successfully.")
