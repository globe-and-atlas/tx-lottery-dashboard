import os

with open("src/App.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == "import './App.css';":
        new_lines.append("import './AppMystic.css';\n")
    elif line.strip() == "function App() {":
        new_lines.append("export default function AppMystic() {\n")
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
    <div className="mys-shell">
      <header className="mys-header">
        <h1>Cosmic Odds</h1>
        <p>Glean your fortune from the mathematical stars.</p>
      </header>

      <div className="mys-panel">
        <h2>Consult the Oracle</h2>
        
        <div className="mys-control-group">
          <label>Your Coordinates (Zip Code)</label>
          <div style={{display: "flex", gap: "12px", alignItems: "center", justifyContent: "center"}}>
            <input className="mys-input" type="text" value={zipCode} maxLength={5} style={{width: "120px"}}
              onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="77002" />
            <button 
              className={`mys-chip ${localSort ? 'active' : ''}`}
              onClick={() => setLocalSort(v => !v)}>
              {localSort ? 'Aligned with Local Energies' : 'Universal Read'}
            </button>
          </div>
        </div>

        <div className="mys-control-group">
          <label>Offering Level</label>
          <div className="mys-chips">
            <button className={`mys-chip ${selectedPrice === 'all' ? 'active' : ''}`} onClick={() => setSelectedPrice('all')}>Any Offering</button>
            {dataset.summary.ticketPrices.map(p => (
              <button key={p} className={`mys-chip ${selectedPrice === p ? 'active' : ''}`} onClick={() => setSelectedPrice(p)}>${p}</button>
            ))}
          </div>
        </div>

        <div className="mys-control-group">
          <label>What do the stars hold?</label>
          <div className="mys-chips" style={{marginBottom: "16px"}}>
            <button className={`mys-chip ${objectiveMode === 'probability10x' ? 'active' : ''}`} onClick={() => setObjectiveMode('probability10x')}>A Sudden Windfall</button>
            <button className={`mys-chip ${objectiveMode === 'jackpotTop' ? 'active' : ''}`} onClick={() => setObjectiveMode('jackpotTop')}>The Ultimate Destiny</button>
            <button className={`mys-chip ${objectiveMode === 'bestReturn' ? 'active' : ''}`} onClick={() => setObjectiveMode('bestReturn')}>Karmic Balance (EV)</button>
          </div>
          {objectiveMode === 'probability10x' && (
            <div style={{background: "var(--mys-bg)", padding: "16px", borderRadius: "8px", border: "1px solid var(--mys-border)", marginTop: "12px"}}>
              <label>Minimum Manifestation</label>
              <div className="mys-chips">
                {[2, 3, 5, 10, 20, 50].map(multiplier => (
                  <button 
                    key={multiplier} 
                    className={`mys-chip ${targetPrizeMultiplier === multiplier ? 'active' : ''}`} 
                    onClick={() => setTargetPrizeMultiplier(multiplier)}>
                    {multiplier}x Return
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {bestGame && (
          <div className="mys-oracle">
            <div className="mys-oracle-title">THE ORACLE SPEAKS</div>
            <div className="mys-oracle-text">
              Fate favors the
              <span className="mys-oracle-strong">{bestGame.gameName}</span>
              Vibrational alignment: <strong>{objectiveMode === 'bestReturn' ? `${formatPerDollar(rankingReturnForGame(bestGame))} EV` : formatOdds(rankingOddsForGame(bestGame))}</strong>.
            </div>
          </div>
        )}
      </div>

      <div className="mys-tabs">
        <button className={workspaceView === 'buy' ? 'active' : ''} onClick={() => setWorkspaceView('buy')}>Readings (By Budget)</button>
        <button className={workspaceView === 'rank' ? 'active' : ''} onClick={() => setWorkspaceView('rank')}>Constellations (All Tickets)</button>
      </div>

      {workspaceView === 'buy' && (
        <div>
          <div className="mys-panel" style={{marginBottom: "24px", textAlign: "center", padding: "16px"}}>
            <label style={{display: "block", marginBottom: "8px", color: "var(--mys-text-muted)", fontStyle: "italic"}}>Custom Offering</label>
            <div style={{display: "flex", justifyContent: "center", alignItems: "center", gap: "8px"}}>
              <span style={{fontFamily: "var(--mys-font-display)", color: "var(--mys-text-gold)", fontSize: "1.4rem"}}>$</span>
              <input type="text" value={customBudgetInput} onChange={e => {
                const next = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCustomBudgetInput(next);
                if (!next) return;
                const parsed = Number.parseInt(next, 10);
                if (Number.isFinite(parsed) && parsed > 0) setEvPreviewBudget(Math.min(parsed, 500));
              }} placeholder="0" className="mys-input" style={{width: "80px", background: "transparent", borderBottom: "1px solid var(--mys-accent-gold)", borderTop: "none", borderLeft: "none", borderRight: "none", borderRadius: "0", padding: "4px"}} />
            </div>
          </div>

          {displayedBudgetPlans.map(({budget, finalPlan: plan}) => (
            <div key={budget} className={`mys-card ${plan && budget >= (bestGame?.ticketPrice ?? 9999) ? 'highlight' : ''}`}>
              <div className="mys-card-title">Offering: {currency.format(budget)}</div>
              <div>
                {plan ? (
                  <>
                    <div className="mys-picks-list">
                      {plan.lines.map((line) => `${line.ticketCount}x ${line.game.gameName}`).join(' ✧ ')}
                    </div>
                    
                    <div className="mys-metric-row"><span className="mys-metric-label">Tribute Paid</span><span className="mys-metric-value">{currency.format(plan.spent)}</span></div>
                    {plan.recommendationTarget === 'expectedValue' ? (
                      <>
                        <div className="mys-metric-row"><span className="mys-metric-label">Foreseen Fortune</span><span className="mys-metric-value good">{formatDollars(plan.estimatedExpectedPayout)}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="mys-metric-row"><span className="mys-metric-label">Destined Probability</span><span className="mys-metric-value good">{percentage.format(plan.estimatedPrimaryChance)}</span></div>
                        <div className="mys-metric-row"><span className="mys-metric-label">Ultimate Fate</span><span className="mys-metric-value">{percentage.format(plan.estimatedTopPrizeChance)}</span></div>
                      </>
                    )}
                  </>
                ) : (
                  <div style={{textAlign: "center", fontStyle: "italic", color: "var(--mys-text-muted)"}}>The stars do not align for this sum.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {workspaceView === 'rank' && (
        <div className="mys-ranking-list">
          {rankedGames.slice(0, 50).map((game, i) => {
            const rScore = rankingScoreForGame(game);
            const scoreStr = objectiveMode === 'bestReturn' ? (rScore ? formatPerDollar(rScore) : 'N/A') : (rScore ? formatOdds(probabilityToOdds(rScore)) : 'N/A');
            
            return (
              <div key={game.gameNumber} className="mys-rank-item">
                <div className="mys-rank-number">{i + 1}</div>
                <div style={{flex: 1}}>
                  <div className="mys-rank-title">{game.gameName}</div>
                  <div style={{fontSize: "0.9rem", color: "var(--mys-text-muted)", fontStyle: "italic", marginTop: "4px"}}>Destiny: {formatDollars(game.topPrizeAmount)} | Offering: {currency.format(game.ticketPrice)}</div>
                </div>
                <div className="mys-rank-score">
                  <span className="mys-rank-score-val">{scoreStr}</span>
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

with open("src/AppMystic.tsx", "w") as f:
    f.writelines(header_part)
    f.write(custom_jsx)

print("Generated src/AppMystic.tsx successfully.")
