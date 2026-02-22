import os

with open("src/App.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == "import './App.css';":
        new_lines.append("import './AppSports.css';\n")
    elif line.strip() == "function App() {":
        new_lines.append("export default function AppSports() {\n")
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
    <div className="sb-shell">
      <header className="sb-header">
        <h1>TX Lotto Edge</h1>
        <p>Live advantage odds. Pick your play.</p>
        
        <div className="sb-hero-stats">
          <div className="sb-stat">
            <span className="label">Markets</span>
            <span className="val">{number.format(dataset.summary.totalGames)}</span>
          </div>
          <div className="sb-stat">
            <span className="label">Tops Left</span>
            <span className="val">{number.format(totalRemainingTopPrizes)}</span>
          </div>
          <div className="sb-stat">
            <span className="label">Updated</span>
            <span className="val" style={{fontSize: "1rem", lineHeight: "1.4em"}}>{formatDate(dataset.source.csvAsOfDate)}</span>
          </div>
        </div>
      </header>

      <div className="sb-panel">
        <div className="sb-control-group">
          <label>Search Markets</label>
          <input className="sb-input" type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a ticket by name or ID..." />
        </div>
        
        <div className="sb-control-group">
          <label>Local Area (ZIP)</label>
          <div style={{display: "flex", gap: "12px", alignItems: "center"}}>
            <input className="sb-input" type="text" value={zipCode} maxLength={5} style={{width: "120px", textAlign: "center"}}
              onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} />
            <button 
              className={`sb-chip ${localSort ? 'active-green' : ''}`}
              onClick={() => setLocalSort(v => !v)}>Boost: {localSort ? 'ON' : 'OFF'}</button>
          </div>
        </div>

        <div className="sb-control-group">
          <label>Ticket Price</label>
          <div className="sb-chips">
            <button className={`sb-chip ${selectedPrice === 'all' ? 'active' : ''}`} onClick={() => setSelectedPrice('all')}>All</button>
            {dataset.summary.ticketPrices.map(p => (
              <button key={p} className={`sb-chip ${selectedPrice === p ? 'active' : ''}`} onClick={() => setSelectedPrice(p)}>${p}</button>
            ))}
          </div>
        </div>

        <div className="sb-control-group">
          <label>Bet Type</label>
          <div className="sb-chips" style={{marginBottom: "12px"}}>
            <button className={`sb-chip ${objectiveMode === 'probability10x' ? 'active-green' : ''}`} onClick={() => setObjectiveMode('probability10x')}>Multiplier</button>
            <button className={`sb-chip ${objectiveMode === 'jackpotTop' ? 'active-green' : ''}`} onClick={() => setObjectiveMode('jackpotTop')}>Jackpot</button>
            <button className={`sb-chip ${objectiveMode === 'bestReturn' ? 'active-green' : ''}`} onClick={() => setObjectiveMode('bestReturn')}>Best EV</button>
          </div>
          {objectiveMode === 'probability10x' && (
            <div style={{background: "var(--sb-bg)", padding: "12px", borderRadius: "12px", border: "1px solid var(--sb-border)"}}>
              <label>Minimum Win</label>
              <div className="sb-chips">
                {[2, 3, 5, 10, 20, 50].map(multiplier => (
                  <button 
                    key={multiplier} 
                    className={`sb-chip ${targetPrizeMultiplier === multiplier ? 'active' : ''}`} 
                    onClick={() => setTargetPrizeMultiplier(multiplier)}>
                    {multiplier}x
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {bestGame && (
          <div className="sb-bet-slip">
            <div className="sb-bet-slip-header">
              <span className="badge">Best Bet</span>
              <span style={{color: "var(--sb-text-muted)", fontSize: "0.8rem", fontWeight: "700"}}>#{bestGame.gameNumber}</span>
            </div>
            <div className="sb-bet-game">{bestGame.gameName}</div>
            <div className="sb-bet-odds">
              <span style={{color: "var(--sb-text-muted)", fontWeight: "600"}}>Odds to hit:</span>
              <span style={{color: "var(--sb-accent-green)"}}>{objectiveMode === 'bestReturn' ? `${formatPerDollar(rankingReturnForGame(bestGame))} EV` : formatOdds(rankingOddsForGame(bestGame))}</span>
            </div>
          </div>
        )}
      </div>

      <div className="sb-tabs">
        <button className={workspaceView === 'buy' ? 'active' : ''} onClick={() => setWorkspaceView('buy')}>Parlays (Budget)</button>
        <button className={workspaceView === 'rank' ? 'active' : ''} onClick={() => setWorkspaceView('rank')}>All Markets</button>
      </div>

      {workspaceView === 'buy' && (
        <div>
          <div className="sb-panel" style={{marginBottom: "20px"}}>
            <label style={{display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--sb-text-muted)"}}>CUSTOM BANKROLL</label>
            <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
              <span style={{color: "var(--sb-accent-green)", fontSize: "1.2rem", fontWeight: 700}}>$</span>
              <input type="text" value={customBudgetInput} onChange={e => {
                const next = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCustomBudgetInput(next);
                if (!next) return;
                const parsed = Number.parseInt(next, 10);
                if (Number.isFinite(parsed) && parsed > 0) setEvPreviewBudget(Math.min(parsed, 500));
              }} placeholder="$0" className="spo-input" style={{width: "80px", textAlign: "center"}} />
              {customBudgetValue && <span style={{color: "var(--sb-accent-blue)", fontSize: "0.85rem", fontWeight: 700}}>PARLAY GENERATED</span>}
            </div>
          </div>

          {displayedBudgetPlans.map(({budget, finalPlan: plan}) => (
            <div key={budget} className={`sb-card ${plan && budget >= (bestGame?.ticketPrice ?? 9999) ? 'highlight' : ''}`}>
              <div className="sb-card-header">
                Bankroll: {currency.format(budget)}
              </div>
              <div className="sb-card-content">
                {plan ? (
                  <>
                    <div className="sb-picks-list">
                      {plan.lines.map((line) => `${line.ticketCount}x ${line.game.gameName}`).join(' • ')}
                    </div>
                    
                    <div className="sb-metric-row"><span className="sb-metric-label">Wager</span><span className="sb-metric-value">{currency.format(plan.spent)}</span></div>
                    {plan.recommendationTarget === 'expectedValue' ? (
                      <>
                        <div className="sb-metric-row"><span className="sb-metric-label">Expected Return</span><span className="sb-metric-value good">{formatDollars(plan.estimatedExpectedPayout)}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="sb-metric-row"><span className="sb-metric-label">Win Implied Prob</span><span className="sb-metric-value good">{percentage.format(plan.estimatedPrimaryChance)}</span></div>
                        <div className="sb-metric-row"><span className="sb-metric-label">Jackpot Prob</span><span className="sb-metric-value">{percentage.format(plan.estimatedTopPrizeChance)}</span></div>
                      </>
                    )}
                  </>
                ) : (
                  <div style={{textAlign: "center", color: "var(--sb-red)", fontWeight: "700"}}>Insufficient Bankroll</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {workspaceView === 'rank' && (
        <div className="sb-panel">
          <h2>Market Leaderboard</h2>
          <table className="sb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Game</th>
                <th>Price</th>
                <th>Implied Odds</th>
              </tr>
            </thead>
            <tbody>
              {rankedGames.map((game, i) => {
                const rScore = rankingScoreForGame(game);
                const scoreStr = objectiveMode === 'bestReturn' ? (rScore ? formatPerDollar(rScore) : 'N/A') : (rScore ? formatOdds(probabilityToOdds(rScore)) : 'N/A');
                
                return (
                  <tr key={game.gameNumber}>
                    <td><span className="sb-rank-badge">{i + 1}</span></td>
                    <td>
                      <span className="sb-game-title">{game.gameName}</span>
                      <span style={{fontSize: "0.75rem", color: "var(--sb-text-sub)"}}>Max: {formatDollars(game.topPrizeAmount)}</span>
                    </td>
                    <td style={{fontWeight: "700"}}>{currency.format(game.ticketPrice)}</td>
                    <td className="sb-ranking-score">{scoreStr}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
"""

with open("src/AppSports.tsx", "w") as f:
    f.writelines(header_part)
    f.write(custom_jsx)

print("Generated src/AppSports.tsx successfully.")
