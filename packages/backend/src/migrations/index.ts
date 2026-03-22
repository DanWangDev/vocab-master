import { initialSchema } from './001_initial_schema';
import { seedAdmin } from './002_seed_admin';
import { fixAdminRole } from './003_fix_admin_role';
import { updateUsersSchema } from './004_update_users_schema';
import { repairFks } from './005_repair_fks';
import { addEmailAndPasswordReset } from './006_add_email_and_password_reset';
import { addNotificationsAndLinkRequests } from './007_add_notifications_and_link_requests';
import { addLanguageSetting } from './008_add_language_setting';
import { addWordlists } from './009_add_wordlists';
import { addPushTokens } from './010_add_push_tokens';
import { addLastSeen } from './011_add_last_seen';
import { addGoogleOauth } from './012_add_google_oauth';
import { addAuditLog } from './013_add_audit_log';
import { addParentThresholds } from './014_add_parent_thresholds';
import { addAchievements } from './015_add_achievements';
import { addLeaderboards } from './016_add_leaderboards';
import { addGroups } from './017_add_groups';
import { addGroupWordlists } from './018_add_group_wordlists';
import { addWordMastery } from './019_add_word_mastery';
import { addPvpChallenges } from './020_add_pvp_challenges';
import { addExerciseResults } from './021_add_exercise_results';
import { addPvpQuestions } from './022_add_pvp_questions';
import { addTimedQuizType } from './023_add_timed_quiz_type';
import { addGamification } from './024_add_gamification';

export const migrations = [
    initialSchema,
    seedAdmin,
    fixAdminRole,
    updateUsersSchema,
    repairFks,
    addEmailAndPasswordReset,
    addNotificationsAndLinkRequests,
    addLanguageSetting,
    addWordlists,
    addPushTokens,
    addLastSeen,
    addGoogleOauth,
    addAuditLog,
    addParentThresholds,
    addAchievements,
    addLeaderboards,
    addGroups,
    addGroupWordlists,
    addWordMastery,
    addPvpChallenges,
    addExerciseResults,
    addPvpQuestions,
    addTimedQuizType,
    addGamification,
];
