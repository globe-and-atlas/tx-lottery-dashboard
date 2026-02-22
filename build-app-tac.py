import os

with open("src/App.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == "import './App.css';":
        new_lines.append("import './AppTac.css';\n")
    elif line.strip() == "function App() {":
        new_lines.append("export default function AppTac() {\n")
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
    <div className="tac-shell">
      <header className="tac-header">
        <span className="tac-eyebrow">FIELD INTEL UNIT</span>
        <h1>Texas Lottery Toolkit</h1>
        <p>Hard data for smart plays. We crunch the state prize files and local activity so you know exactly where to put your money.</p>
        
        <div className="tac-stats-grid">
          <div className="tac-stat">
            <span className="label">Active Tickets</span>
            <span className="val">{number.format(dataset.summary.totalGames)}</span>
          </div>
          <div className="tac-stat">
            <span className="label">Top Prizes Left</span>
            <span className="val">{number.format(totalRemainingTopPrizes)}</span>
          </div>
          <div className="tac-stat">
            <span className="label">Last Data Pull</span>
            <span className="val" style={{fontSize: "2.5rem", marginTop: "10px"}}>{formatDate(dataset.source.csvAsOfDate)}</span>
          </div>
        </div>
      </header>

      <section className="tac-controls-container">
        <div className="tac-controls-grid">
          <div className="tac-control-group">
            <label>LOCATE GAME</label>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Type name or ID number..." />
          </div>
          
          <div className="tac-control-group">
            <label>YOUR OP AREA (ZIP)</label>
            <div style={{display: "flex", gap: "12px", alignItems: "center"}}>
              <input type="text" value={zipCode} maxLength={5} style={{width: "100px", textAlign: "center"}}
                onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} />
              <button 
                className={`tac-chip ${localSort ? 'active' : ''}`}
                onClick={() => setLocalSort(v => !v)}>LOCAL RADAR: {localSort ? 'ON' : 'OFF'}</button>
            </div>
          </div>
        </div>

        <div className="tac-controls-grid" style={{marginTop: "24px"}}>
          <div className="tac-control-group">
            <label>BUY-IN PRICE</label>
            <div className="tac-chips">
              <button className={`tac-chip ${selectedPrice === 'all' ? 'active' : ''}`} onClick={() => setSelectedPrice('all')}>ALL TIERS</button>
              {dataset.summary.ticketPrices.map(p => (
                <button key={p} className={`tac-chip ${selectedPrice === p ? 'active' : ''}`} onClick={() => setSelectedPrice(p)}>${p}</button>
              ))}
            </div>
          </div>

          <div className="tac-control-group">
            <label>MISSION OBJECTIVE</label>
            <div className="tac-chips">
              <button className={`tac-chip ${objectiveMode === 'probability10x' ? 'active' : ''}`} onClick={() => setObjectiveMode('probability10x')}>MIN RETURN (SAFE)</button>
              <button className={`tac-chip ${objectiveMode === 'jackpotTop' ? 'active' : ''}`} onClick={() => setObjectiveMode('jackpotTop')}>JACKPOT HUNT (AGGRO)</button>
              <button className={`tac-chip ${objectiveMode === 'bestReturn' ? 'active' : ''}`} onClick={() => setObjectiveMode('bestReturn')}>MAX ROI (MATH)</button>
            </div>
            {objectiveMode === 'probability10x' && (
              <div style={{marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--tac-border)"}}>
                <label style={{fontSize: "1.2rem"}}>PAYOUT MINIMUM</label>
                <div className="tac-chips">
                  {[2, 3, 5, 10, 20, 50].map(multiplier => (
                    <button 
                      key={multiplier} 
                      className={`tac-chip ${targetPrizeMultiplier === multiplier ? 'active' : ''}`} 
                      onClick={() => setTargetPrizeMultiplier(multiplier)}>
                      {multiplier}X
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {bestGame && (
          <div className="tac-target-lock">
            <div className="tac-target-icon">⌖</div>
            <div>
              <p><strong>TARGET ACQUIRED:</strong> Grab <strong>{bestGame.gameName}</strong>.</p>
              <p>Current rating: <strong>{objectiveMode === 'bestReturn' ? `${formatPerDollar(rankingReturnForGame(bestGame))} EV` : formatOdds(rankingOddsForGame(bestGame))}</strong>.</p>
            </div>
          </div>
        )}
      </section>

      <div className="tac-nav">
        <button className={`tac-chip ${workspaceView === 'buy' ? 'active' : ''}`} onClick={() => setWorkspaceView('buy')}>LOADOUTS (BUDGETS)</button>
        <button className={`tac-chip ${workspaceView === 'rank' ? 'active' : ''}`} onClick={() => setWorkspaceView('rank')}>INTEL LOG (RANKS)</button>
      </div>

      {workspaceView === 'buy' && (
        <section>
          <h2>Recommended Loadouts</h2>
          
          <div className="tac-panel" style={{marginBottom: "24px"}}>
            <label style={{display: "block", marginBottom: "12px", color: "var(--tac-muted)", fontWeight: 700}}>DEFINE CUSTOM BUDGET PARAMETER</label>
            <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
              <span style={{fontSize: "1.5rem", color: "var(--tac-accent)", fontWeight: 800}}>$</span>
              <input type="text" value={customBudgetInput} onChange={e => {
                const next = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCustomBudgetInput(next);
                if (!next) return;
                const parsed = Number.parseInt(next, 10);
                if (Number.isFinite(parsed) && parsed > 0) setEvPreviewBudget(Math.min(parsed, 500));
              }} placeholder="0" className="tac-input" style={{width: "80px", textAlign: "center"}} />
              {customBudgetValue && <span style={{color: "var(--tac-text)", fontWeight: 700}}>GENERATING TACTICAL LOADOUT...</span>}
            </div>
          </div>

          <div className="tac-card-grid">
            {displayedBudgetPlans.map(({budget, finalPlan: plan}) => (
              <div key={budget} className={`tac-card ${plan && budget >= (bestGame?.ticketPrice ?? 9999) ? 'optimal' : ''}`}>
                <div className="tac-card-header">
                  BUDGET: {currency.format(budget)}
                </div>
                {plan ? (
                  <>
                    <div className="tac-loadout">
                      {plan.lines.map((line) => `${line.ticketCount}x ${line.game.gameName}`).join(' & ')}
                    </div>
                    
                    <div className="tac-row"><span className="k">CASH OUTLAY</span><span className="v">{currency.format(plan.spent)}</span></div>
                    {plan.recommendationTarget === 'expectedValue' ? (
                      <>
                        <div className="tac-row"><span className="k">MATH PAYOUT</span><span className="v highlight">{formatDollars(plan.estimatedExpectedPayout)}</span></div>
                        <div className="tac-row"><span className="k">AVG PROFIT/LOSS</span><span className="v">{formatDollars(plan.estimatedExpectedNet)}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="tac-row"><span className="k">WIN RATIO</span><span className="v highlight">{percentage.format(plan.estimatedPrimaryChance)}</span></div>
                        <div className="tac-row"><span className="k">BIG HIT CHANCE</span><span className="v">{percentage.format(plan.estimatedTopPrizeChance)}</span></div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="tac-row" style={{border: "none"}}><span className="k">STATUS</span><span className="v">NEED MORE FUNDS</span></div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {workspaceView === 'rank' && (
        <section>
          <h2>Full Intel Database</h2>
          <div className="tac-table-wrapper">
            <table className="tac-table">
              <thead>
                <tr>
                  <th>RK</th>
                  <th>TICKET OP</th>
                  <th>BUY-IN</th>
                  <th>PAYLOAD (MAX)</th>
                  <th>IN STOCK</th>
                  <th>RATING SCORE</th>
                </tr>
              </thead>
              <tbody>
                {rankedGames.map((game, i) => {
                  const rScore = rankingScoreForGame(game);
                  const baseMetric = objectiveMode === 'bestReturn' ? formatPerDollar(game.conservativeReturnPerDollar) : formatOdds(game.objectiveBaseOddsOneIn);
                  const scoreStr = objectiveMode === 'bestReturn' ? (rScore ? formatPerDollar(rScore) : 'N/A') : (rScore ? formatOdds(probabilityToOdds(rScore)) : 'N/A');
                  
                  return (
                    <tr key={game.gameNumber}>
                      <td><span className="tac-rank">{i + 1}</span></td>
                      <td className="tac-name-block">
                        <strong>{game.gameName}</strong>
                        <span>ID: #{game.gameNumber}</span>
                      </td>
                      <td>{currency.format(game.ticketPrice)}</td>
                      <td><span className="tac-text-accent">{formatDollars(game.topPrizeAmount)}</span></td>
                      <td>{number.format(game.topPrizesRemaining)} Left</td>
                      <td className="tac-huge-metric">{scoreStr}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  );
}
"""

with open("src/AppTac.tsx", "w") as f:
    f.writelines(header_part)
    f.write(custom_jsx)

print("Generated src/AppTac.tsx successfully.")
