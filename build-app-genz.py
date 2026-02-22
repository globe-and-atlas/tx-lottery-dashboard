import os

with open("src/App.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == "import './App.css';":
        new_lines.append("import './AppGenz.css';\n")
    elif line.strip() == "function App() {":
        new_lines.append("export default function AppGenz() {\n")
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
    <div className="genz-shell">
      <header className="genz-header">
        <h1>BAG CHASER</h1>
        <div className="genz-marquee">
          <span className="genz-marquee-inner">
            • TRACKING {dataset.summary.totalGames} TICKETS • JACKPOTS LEFT: {totalRemainingTopPrizes} • UPDATED: {formatDate(dataset.source.csvAsOfDate)} • DON'T PLAY BLIND • THE MATH DON'T LIE
          </span>
        </div>
        <div className="genz-sticker">18+<br/>ONLY</div>
      </header>

      <div className="genz-panel">
        <h2>THE SETUP</h2>

        <div className="genz-control-group">
          <label>YOUR ZIP CODE</label>
          <div style={{display: "flex", gap: "12px", alignItems: "center"}}>
            <input className="genz-input" type="text" value={zipCode} maxLength={5} style={{width: "120px", textAlign: "center"}}
              onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="77002" />
            <button 
              className={`genz-chip ${localSort ? 'active' : ''}`}
              onClick={() => setLocalSort(v => !v)}>
              {localSort ? 'LOCAL HEAT' : 'STATEWIDE'}
            </button>
          </div>
        </div>

        <div className="genz-control-group">
          <label>PRICE FILTER</label>
          <div className="genz-chips">
            <button className={`genz-chip ${selectedPrice === 'all' ? 'active' : ''}`} onClick={() => setSelectedPrice('all')}>ANY</button>
            {dataset.summary.ticketPrices.map(p => (
              <button key={p} className={`genz-chip ${selectedPrice === p ? 'active' : ''}`} onClick={() => setSelectedPrice(p)}>${p}</button>
            ))}
          </div>
        </div>

        <div className="genz-control-group">
          <label>THE MOVE</label>
          <div className="genz-chips" style={{marginBottom: "16px"}}>
            <button className={`genz-chip ${objectiveMode === 'probability10x' ? 'active' : ''}`} onClick={() => setObjectiveMode('probability10x')}>QUICK FLIP</button>
            <button className={`genz-chip ${objectiveMode === 'jackpotTop' ? 'active' : ''}`} onClick={() => setObjectiveMode('jackpotTop')}>JACKPOT OR BUST</button>
            <button className={`genz-chip ${objectiveMode === 'bestReturn' ? 'active' : ''}`} onClick={() => setObjectiveMode('bestReturn')}>MAX VALUE</button>
          </div>
          {objectiveMode === 'probability10x' && (
            <div style={{background: "var(--genz-accent-1)", padding: "16px", borderRadius: "16px", border: "2px solid black"}}>
              <label>MINIMUM BAG</label>
              <div className="genz-chips">
                {[2, 3, 5, 10, 20, 50].map(multiplier => (
                  <button 
                    key={multiplier} 
                    className={`genz-chip ${targetPrizeMultiplier === multiplier ? 'active' : ''}`} 
                    onClick={() => setTargetPrizeMultiplier(multiplier)}
                    style={{background: targetPrizeMultiplier === multiplier ? "black" : "white"}}>
                    {multiplier}X
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="genz-tabs">
        <button className={workspaceView === 'buy' ? 'active' : ''} onClick={() => setWorkspaceView('buy')}>CART</button>
        <button className={workspaceView === 'rank' ? 'active' : ''} onClick={() => setWorkspaceView('rank')}>LEADERBOARD</button>
      </div>

      {workspaceView === 'buy' && (
        <div>
          <div className="genz-panel" style={{marginBottom: "24px"}}>
            <label style={{textAlign: "center"}}>CUSTOM BUDGET DROP</label>
            <div style={{display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "12px"}}>
              <span style={{fontSize: "2rem", fontWeight: 800, color: "var(--genz-accent-3)"}}>$</span>
              <input type="text" value={customBudgetInput} onChange={e => {
                const next = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCustomBudgetInput(next);
                if (!next) return;
                const parsed = Number.parseInt(next, 10);
                if (Number.isFinite(parsed) && parsed > 0) setEvPreviewBudget(Math.min(parsed, 500));
              }} placeholder="0" className="genz-input" style={{width: "120px", textAlign: "center", fontSize: "1.5rem"}} />
            </div>
          </div>

          {displayedBudgetPlans.map(({budget, finalPlan: plan}) => (
            <div key={budget} className={`genz-card ${plan && budget >= (bestGame?.ticketPrice ?? 9999) ? 'highlight' : ''}`}>
              <div className="genz-card-title">SPENDING {currency.format(budget)}</div>
              <div>
                {plan ? (
                  <>
                    <div className="genz-picks-list">
                      {plan.lines.map((line) => `${line.ticketCount}x ${line.game.gameName}`).join(' + ')}
                    </div>
                    
                    <div className="genz-metric-row"><span className="genz-metric-label">COST</span><span className="genz-metric-value">{currency.format(plan.spent)}</span></div>
                    {plan.recommendationTarget === 'expectedValue' ? (
                      <>
                        <div className="genz-metric-row"><span className="genz-metric-label">EST VALUE</span><span className="genz-metric-value good">{formatDollars(plan.estimatedExpectedPayout)}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="genz-metric-row"><span className="genz-metric-label">WIN PROB</span><span className="genz-metric-value good">{percentage.format(plan.estimatedPrimaryChance)}</span></div>
                        <div className="genz-metric-row"><span className="genz-metric-label">JACKPOT PROB</span><span className="genz-metric-value">{percentage.format(plan.estimatedTopPrizeChance)}</span></div>
                      </>
                    )}
                  </>
                ) : (
                  <div style={{textAlign: "center", fontWeight: "800", color: "var(--genz-accent-2)", fontSize: "1.2rem"}}>GET MORE BANDS 💸</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {workspaceView === 'rank' && (
        <div>
          {rankedGames.map((game, i) => {
            const rScore = rankingScoreForGame(game);
            const scoreStr = objectiveMode === 'bestReturn' ? (rScore ? formatPerDollar(rScore) : 'N/A') : (rScore ? formatOdds(probabilityToOdds(rScore)) : 'N/A');
            
            return (
              <div key={game.gameNumber} className="genz-rank-item">
                <div className="genz-rank-number">{i + 1}</div>
                <div style={{flex: 1}}>
                  <div className="genz-rank-title">{game.gameName}</div>
                  <div style={{fontSize: "0.85rem", fontWeight: 700}}>JACKPOT: {formatDollars(game.topPrizeAmount)}</div>
                </div>
                <div className="genz-rank-score">
                  <span className="genz-rank-score-val">{scoreStr}</span>
                  <span style={{fontSize: "0.85rem", fontWeight: 700, background: "black", color: "white", padding: "2px 6px", borderRadius: "10px"}}>{currency.format(game.ticketPrice)}</span>
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

with open("src/AppGenz.tsx", "w") as f:
    f.writelines(header_part)
    f.write(custom_jsx)

print("Generated src/AppGenz.tsx successfully.")
