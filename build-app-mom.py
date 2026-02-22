import os

with open("src/App.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == "import './App.css';":
        new_lines.append("import './AppMom.css';\n")
    elif line.strip() == "function App() {":
        new_lines.append("export default function AppMom() {\n")
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
    <div className="mom-shell">
      <header className="mom-header">
        <h1>Treat Yourself</h1>
        <p>A little guided luxury. Texas scratch-offs, decoded just for you.</p>
        
        <div className="mom-hero-stats">
          <div className="mom-stat">
            <span className="val">{number.format(dataset.summary.totalGames)}</span>
            <span className="label">Tickets Found</span>
          </div>
          <div className="mom-stat">
            <span className="val">{number.format(totalRemainingTopPrizes)}</span>
            <span className="label">Grand Prizes Left</span>
          </div>
          <div className="mom-stat">
            <span className="val">{formatDate(dataset.source.csvAsOfDate)}</span>
            <span className="label">Last Updated</span>
          </div>
        </div>
      </header>

      <div className="mom-panel">
        <h2>Your Preferences</h2>

        <div className="mom-control-group">
          <label>Where are you shopping today?</label>
          <div style={{display: "flex", gap: "12px", alignItems: "center"}}>
            <input className="mom-input" type="text" value={zipCode} maxLength={5} style={{width: "140px", textAlign: "center"}}
              onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="Zip Code" />
            <button 
              className={`mom-chip ${localSort ? 'active' : ''}`}
              onClick={() => setLocalSort(v => !v)}>
              {localSort ? 'Curating Locally' : 'Statewide Results'}
            </button>
          </div>
        </div>

        <div className="mom-control-group">
          <label>Ticket Price Point</label>
          <div className="mom-chips">
            <button className={`mom-chip ${selectedPrice === 'all' ? 'active' : ''}`} onClick={() => setSelectedPrice('all')}>Any Price</button>
            {dataset.summary.ticketPrices.map(p => (
              <button key={p} className={`mom-chip ${selectedPrice === p ? 'active' : ''}`} onClick={() => setSelectedPrice(p)}>${p}</button>
            ))}
          </div>
        </div>

        <div className="mom-control-group">
          <label>What are we hoping for?</label>
          <div className="mom-chips" style={{marginBottom: "16px"}}>
            <button className={`mom-chip ${objectiveMode === 'probability10x' ? 'active' : ''}`} onClick={() => setObjectiveMode('probability10x')}>A Nice Bonus</button>
            <button className={`mom-chip ${objectiveMode === 'jackpotTop' ? 'active' : ''}`} onClick={() => setObjectiveMode('jackpotTop')}>The Grand Prize</button>
            <button className={`mom-chip ${objectiveMode === 'bestReturn' ? 'active' : ''}`} onClick={() => setObjectiveMode('bestReturn')}>Best Mathematical Value</button>
          </div>
          {objectiveMode === 'probability10x' && (
            <div style={{background: "var(--mom-bg)", padding: "16px", borderRadius: "16px", border: "1px solid var(--mom-border)"}}>
              <label>Minimum Expected Payout</label>
              <div className="mom-chips">
                {[2, 3, 5, 10, 20, 50].map(multiplier => (
                  <button 
                    key={multiplier} 
                    className={`mom-chip ${targetPrizeMultiplier === multiplier ? 'active' : ''}`} 
                    onClick={() => setTargetPrizeMultiplier(multiplier)}>
                    {multiplier}x Ticket Cost
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {bestGame && (
          <div className="mom-alert">
            <div className="mom-alert-title">Top Recommendation</div>
            <div className="mom-alert-text">
              Treat yourself to the <strong>{bestGame.gameName}</strong>! Enjoy a current rating of <strong>{objectiveMode === 'bestReturn' ? `${formatPerDollar(rankingReturnForGame(bestGame))} EV` : formatOdds(rankingOddsForGame(bestGame))}</strong>.
            </div>
          </div>
        )}
      </div>

      <div className="mom-tabs">
        <button className={workspaceView === 'buy' ? 'active' : ''} onClick={() => setWorkspaceView('buy')}>Shopping List</button>
        <button className={workspaceView === 'rank' ? 'active' : ''} onClick={() => setWorkspaceView('rank')}>Browse All Games</button>
      </div>

      {workspaceView === 'buy' && (
        <div>
          <div className="mom-panel" style={{marginBottom: "24px", textAlign: "center"}}>
            <label style={{display: "block", marginBottom: "12px", fontStyle: "italic", fontFamily: "var(--mom-font-serif)", fontSize: "1.1rem"}}>Have a specific budget in mind?</label>
            <div style={{display: "flex", justifyContent: "center", alignItems: "center", gap: "8px"}}>
              <span style={{color: "var(--mom-accent)", fontSize: "1.4rem", fontFamily: "var(--mom-font-serif)"}}>$</span>
              <input type="text" value={customBudgetInput} onChange={e => {
                const next = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCustomBudgetInput(next);
                if (!next) return;
                const parsed = Number.parseInt(next, 10);
                if (Number.isFinite(parsed) && parsed > 0) setEvPreviewBudget(Math.min(parsed, 500));
              }} placeholder="0" className="mom-input" style={{width: "100px", textAlign: "center"}} />
            </div>
            {customBudgetValue && <div style={{color: "var(--mom-accent)", fontSize: "0.9rem", marginTop: "12px"}}>Your custom shopping list is ready below!</div>}
          </div>

          {displayedBudgetPlans.map(({budget, finalPlan: plan}) => (
            <div key={budget} className={`mom-card ${plan && budget >= (bestGame?.ticketPrice ?? 9999) ? 'highlight' : ''}`}>
              <div className="mom-card-title">If you're spending {currency.format(budget)}</div>
              <div className="mom-card-content">
                {plan ? (
                  <>
                    <div className="mom-picks-list">
                      {plan.lines.map((line) => `${line.ticketCount}x ${line.game.gameName}`).join(' ✨ ')}
                    </div>
                    
                    <div className="mom-metric-row"><span className="mom-metric-label">Total Cost</span><span className="mom-metric-value">{currency.format(plan.spent)}</span></div>
                    {plan.recommendationTarget === 'expectedValue' ? (
                      <>
                        <div className="mom-metric-row"><span className="mom-metric-label">Estimated Payout</span><span className="mom-metric-value good">{formatDollars(plan.estimatedExpectedPayout)}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="mom-metric-row"><span className="mom-metric-label">Likelihood to Win</span><span className="mom-metric-value good">{percentage.format(plan.estimatedPrimaryChance)}</span></div>
                        <div className="mom-metric-row"><span className="mom-metric-label">Jackpot Chance</span><span className="mom-metric-value">{percentage.format(plan.estimatedTopPrizeChance)}</span></div>
                      </>
                    )}
                  </>
                ) : (
                  <div style={{textAlign: "center", color: "var(--mom-text-medium)", fontStyle: "italic"}}>Budget is too low for current filters.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {workspaceView === 'rank' && (
        <div className="mom-leaderboard">
          {rankedGames.map((game, i) => {
            const rScore = rankingScoreForGame(game);
            const scoreStr = objectiveMode === 'bestReturn' ? (rScore ? formatPerDollar(rScore) : 'N/A') : (rScore ? formatOdds(probabilityToOdds(rScore)) : 'N/A');
            
            return (
              <div key={game.gameNumber} className="mom-rank-item">
                <div className="mom-rank-number">{i + 1}</div>
                <div className="mom-rank-details">
                  <div className="mom-rank-title">{game.gameName}</div>
                  <div className="mom-rank-meta">Grand Prize: {formatDollars(game.topPrizeAmount)}</div>
                </div>
                <div className="mom-rank-score">
                  <span className="mom-rank-score-val">{scoreStr}</span>
                  <span className="mom-rank-price">{currency.format(game.ticketPrice)} per ticket</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  );
}
"""

with open("src/AppMom.tsx", "w") as f:
    f.writelines(header_part)
    f.write(custom_jsx)

print("Generated src/AppMom.tsx successfully.")
