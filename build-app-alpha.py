import os

with open("src/App.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == "import './App.css';":
        new_lines.append("import './AppAlpha.css';\n")
    elif line.strip() == "function App() {":
        new_lines.append("export default function AppAlpha() {\n")
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
    <div className="alp-shell">
      <header className="alp-header">
        <h1>💀 W Rizz 💀</h1>
        <p>No Cap. The math is literally right here.</p>
      </header>

      <div className="alp-panel">
        <h2>POV: You're trying to win</h2>

        <div className="alp-control-group">
          <label>DROP UR ZIP</label>
          <div style={{display: "flex", gap: "12px", alignItems: "center"}}>
            <input className="alp-input" type="text" value={zipCode} maxLength={5} style={{width: "120px", textAlign: "center"}}
              onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="77002" />
            <button 
              className={`alp-chip ${localSort ? 'active' : ''}`}
              onClick={() => setLocalSort(v => !v)}>
              {localSort ? 'NEAR ME 📍' : 'TEXAS 🤠'}
            </button>
          </div>
        </div>

        <div className="alp-control-group">
          <label>ALLOWANCE SPEND</label>
          <div className="alp-chips">
            <button className={`alp-chip ${selectedPrice === 'all' ? 'active' : ''}`} onClick={() => setSelectedPrice('all')}>ALL DAT</button>
            {dataset.summary.ticketPrices.map(p => (
              <button key={p} className={`alp-chip ${selectedPrice === p ? 'active' : ''}`} onClick={() => setSelectedPrice(p)}>${p}</button>
            ))}
          </div>
        </div>

        <div className="alp-control-group">
          <label>CHOOSE YOUR FIGHTER</label>
          <div className="alp-chips" style={{marginBottom: "16px"}}>
            <button className={`alp-chip ${objectiveMode === 'probability10x' ? 'active' : ''}`} onClick={() => setObjectiveMode('probability10x')}>QUICK FLEX 💰</button>
            <button className={`alp-chip ${objectiveMode === 'jackpotTop' ? 'active' : ''}`} onClick={() => setObjectiveMode('jackpotTop')}>MR BEAST MODE 🏆</button>
            <button className={`alp-chip ${objectiveMode === 'bestReturn' ? 'active' : ''}`} onClick={() => setObjectiveMode('bestReturn')}>SIGMA GRINDSET 📈</button>
          </div>
          {objectiveMode === 'probability10x' && (
            <div style={{background: "var(--alp-bg)", padding: "16px", borderRadius: "24px", textAlign: "center"}}>
              <label>MULTIPLIER BET</label>
              <div className="alp-chips">
                {[2, 3, 5, 10, 20, 50].map(multiplier => (
                  <button 
                    key={multiplier} 
                    className={`alp-chip ${targetPrizeMultiplier === multiplier ? 'active' : ''}`} 
                    onClick={() => setTargetPrizeMultiplier(multiplier)}>
                    {multiplier}X
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {bestGame && (
          <div className="alp-alert">
            <p>
              🚨 BIG DUBS COMING IN: 🚨 <br/>
              Cop the <strong>{bestGame.gameName}</strong>! Rating: {objectiveMode === 'bestReturn' ? `${formatPerDollar(rankingReturnForGame(bestGame))} EV` : formatOdds(rankingOddsForGame(bestGame))}.
            </p>
          </div>
        )}
      </div>

      <div className="alp-tabs">
        <button className={workspaceView === 'buy' ? 'active' : ''} onClick={() => setWorkspaceView('buy')}>GOON CAVE</button>
        <button className={workspaceView === 'rank' ? 'active' : ''} onClick={() => setWorkspaceView('rank')}>LEADERBOARD</button>
      </div>

      {workspaceView === 'buy' && (
        <div>
          <div className="alp-panel" style={{marginBottom: "24px"}}>
            <label style={{textAlign: "center"}}>V-BUCKS BUDGET</label>
            <div style={{display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "12px"}}>
              <span style={{fontSize: "2rem", fontWeight: 900}}>$</span>
              <input type="text" value={customBudgetInput} onChange={e => {
                const next = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCustomBudgetInput(next);
                if (!next) return;
                const parsed = Number.parseInt(next, 10);
                if (Number.isFinite(parsed) && parsed > 0) setEvPreviewBudget(Math.min(parsed, 500));
              }} placeholder="0" className="alp-input" style={{width: "120px", textAlign: "center"}} />
            </div>
          </div>

          {displayedBudgetPlans.map(({budget, finalPlan: plan}) => (
            <div key={budget} className={`alp-card ${plan && budget >= (bestGame?.ticketPrice ?? 9999) ? 'highlight' : ''}`}>
              <div style={{textAlign: "center"}}>
                <span className="alp-card-header">IF YOU GOT {currency.format(budget)}</span>
              </div>
              <div>
                {plan ? (
                  <>
                    <div className="alp-picks-list">
                      {plan.lines.map((line) => `${line.ticketCount}x ${line.game.gameName}`).join(' 🥶 ')}
                    </div>
                    
                    <div className="alp-metric-row"><span className="alp-metric-label">COST</span><span className="alp-metric-val">{currency.format(plan.spent)}</span></div>
                    {plan.recommendationTarget === 'expectedValue' ? (
                      <>
                        <div className="alp-metric-row"><span className="alp-metric-label">EST ROI</span><span className="alp-metric-val good">{formatDollars(plan.estimatedExpectedPayout)}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="alp-metric-row"><span className="alp-metric-label">WIN PROB</span><span className="alp-metric-val good">{percentage.format(plan.estimatedPrimaryChance)}</span></div>
                        <div className="alp-metric-row"><span className="alp-metric-label">JACKPOT PROB</span><span className="alp-metric-val">{percentage.format(plan.estimatedTopPrizeChance)}</span></div>
                      </>
                    )}
                  </>
                ) : (
                  <div style={{textAlign: "center", fontWeight: "900", fontSize: "1.2rem"}}>BROKE BOY VIBES 😭</div>
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
              <div key={game.gameNumber} className="alp-rank-item">
                <div className="alp-rank-number">#{i + 1}</div>
                <div style={{flex: 1}}>
                  <div className="alp-rank-title">{game.gameName}</div>
                  <div style={{fontSize: "0.9rem", fontWeight: 800, color: "var(--alp-accent-1)"}}>MAX WIN: {formatDollars(game.topPrizeAmount)} | COST: {currency.format(game.ticketPrice)}</div>
                </div>
                <div className="alp-rank-score">{scoreStr}</div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  );
}
"""

with open("src/AppAlpha.tsx", "w") as f:
    f.writelines(header_part)
    f.write(custom_jsx)

print("Generated src/AppAlpha.tsx successfully.")
