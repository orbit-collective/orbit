import { AnimatePresence, motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import React from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import CommentItem from '@/Components/Molecules/CommentItem/CommentItem';
import { CommentListProps } from '@/types/Components';
import { DURATION, EASE, SPRING, riseIn, rowDelay } from '@/utils/motion';

const CommentList: React.FC<CommentListProps> = ({
    comments,
    users,
    projectId,
    onEdit,
    onDelete,
    onImageUpload,
}) => {
    const { t } = useLaravelReactI18n();

    if (comments.length === 0) {
        return (
            <motion.div
                variants={riseIn}
                initial="hidden"
                animate="show"
                className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center"
            >
                <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ ...SPRING, delay: 0.1 }}
                >
                    <Icon
                        name="MessageSquare"
                        size={22}
                        className="text-(--text-muted-color)"
                    />
                </motion.span>
                <p className="text-xs font-medium text-(--text-muted-color)">
                    {t('comment_list.empty')}
                </p>
            </motion.div>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            <AnimatePresence initial>
                {comments.map((comment, index) => (
                    <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            transition: {
                                duration: DURATION.base,
                                ease: EASE,
                                delay: rowDelay(index),
                            },
                        }}
                        exit={{
                            opacity: 0,
                            x: -24,
                            transition: { duration: DURATION.fast },
                        }}
                    >
                        <CommentItem
                            comment={comment}
                            users={users}
                            projectId={projectId}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onImageUpload={onImageUpload}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default CommentList;
