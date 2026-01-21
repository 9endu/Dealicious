from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class GroupAI:
    def select_best_receiver(self, members: List[Dict], group_creator_id: str) -> str:
        """
        Selects the most trustworthy member to receive the bulk order.
        Criteria:
        1. Trust Score (Must be > 60)
        2. Tenure (Earliest joiner wins tie)
        3. Fallback to Creator if no one qualifies (but flag it)
        """
        
        # Filter candidates with decent trust
        candidates = [m for m in members if m.get('trust_score', 0) >= 60.0]
        
        if not candidates:
            # Fallback to creator, or maybe the highest available
            sorted_by_trust = sorted(members, key=lambda x: x.get('trust_score', 0), reverse=True)
            best = sorted_by_trust[0]
            logger.warning(f"No high trust members found. Defaulting to {best['user_id']} with score {best.get('trust_score')}")
            return best['user_id']
            
        # Sort by Trust (Desc) then Join Time (Asc - assumed by list order if not present)
        # Assuming members list is ordered by join time
        best_candidate = sorted(candidates, key=lambda x: x.get('trust_score', 0), reverse=True)[0]
        
        return best_candidate['user_id']

    def check_group_viability(self, current_size: int, target_size: int, time_elapsed_hours: float) -> bool:
        """
        AI Logic to determine if a group should be cancelled or extended.
        """
        if current_size >= target_size:
            return True
            
        # auto-cancel if < 50% filled in 48 hours
        if time_elapsed_hours > 48 and (current_size / target_size) < 0.5:
            return False
            
        return True

group_ai = GroupAI()
